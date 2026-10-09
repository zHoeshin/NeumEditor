const OctoCompiler = (await import("./octo_compiler.js")).Compiler

const keys = [
	KeyboardDevice.usb.KeyX,
	KeyboardDevice.usb.Digit1,
	KeyboardDevice.usb.Digit2,
	KeyboardDevice.usb.Digit3,
	KeyboardDevice.usb.KeyQ,
	KeyboardDevice.usb.KeyW,
	KeyboardDevice.usb.KeyE,
	KeyboardDevice.usb.KeyA,
	KeyboardDevice.usb.KeyS,
	KeyboardDevice.usb.KeyD,
	KeyboardDevice.usb.KeyZ,
	KeyboardDevice.usb.KeyC,
	KeyboardDevice.usb.Digit4,
	KeyboardDevice.usb.KeyR,
	KeyboardDevice.usb.KeyF,
	KeyboardDevice.usb.KeyV,
]
const keynames = [
		"KeyX", "Digit1", "Digit2", "Digit3",
		"KeyQ", "KeyW", "KeyE", "KeyA",
		"KeyS", "KeyD", "KeyZ", "KeyC",
		"Digit4", "KeyR", "KeyF", "KeyV",
	]

const keyCallback = (e) => {
	if (keynames.includes(e.code)) {
		removeEventListener("keydown", keyCallback)
		RuntimeManager.sendInput(keynames.indexOf(e.code))
		e.preventDefault()
	}
}

class Chip8Interpreter {
	constructor(rom, spd) {
		this.ram = rom
		this.pc = 0x200
		this.v = new Uint8Array(16)
		this.i = 0
		this.stack = new Uint16Array(16)
		this.sp = 0
		this.delay = 0
		this.sound = 0
		this.buffer = new Uint32Array(128 * 64)
		this.frame = new Uint32Array(128 * 64)
		this.frame.fill(0xff000000)
		this.speed = spd > 0 ? spd / 60 : -1
		this.frametop = true
		this.framebottom = false
		this.hires = false
	}

	dispose() {
		removeEventListener("keydown", keyCallback)
	}

	markCurrentLine(){}
	getLine(){}

	drawSprite(x, y, addr, rows) {
		x = (x << 24) >> 24
		y = (y << 24) >> 24
		if (this.hires) {
			for(let row = 0; row < rows; row += 1) {
				let spr = this.ram[(this.i + row) & 0xffff]
				for(let column = 0; column < 8; column += 1) {
					const px = x + column
					const py = y + row
					if (px >= 0 && px < 128 && py >= 0 && py < 64 && (spr & 0b10000000)) {
						const pos = (py << 7) | px
						if ((this.frame[pos] & 0xff777777) && this.frametop) {
							this.v[0xf] = 1
						}
						if ((this.frame[pos] & 0xff888888) && this.framebottom) {
							this.v[0xf] = 1
						}
						if (this.frametop) {
							this.frame[pos] ^= 0x00ffffff
						}
						if (this.framebottom) {
							this.frame[pos] ^= 0x00888888
						}
					}
					spr = (spr << 1) & 0xff
				}
			}
		} else {
			for(let row = 0; row < rows; row += 1) {
				let spr = this.ram[(this.i + row) & 0xffff]
				for(let column = 0; column < 8; column += 1) {
					const px = (x + column) * 2
					const py = (y + row) * 2
					if (px >= 0 && px < 128 && py >= 0 && py < 64 && (spr & 0b10000000)) {
						const pos = (py << 7) | px
						if ((this.frame[pos] & 0xff777777) && this.frametop) {
							this.v[0xf] = 1
						}
						if ((this.frame[pos] & 0xff888888) && this.framebottom) {
							this.v[0xf] = 1
						}
						if (this.frametop) {
							this.frame[pos] ^= 0x00ffffff
							if (x < 127) this.frame[pos + 1] ^= 0x00ffffff
							if (y < 63) this.frame[pos + 128] ^= 0x00ffffff
							if (x < 127 && x < 63) this.frame[pos + 129] ^= 0x00ffffff
						}
						if (this.framebottom) {
							this.frame[pos] ^= 0x00888888
							if (x < 127) this.frame[pos + 1] ^= 0x00888888
							if (y < 63) this.frame[pos + 128] ^= 0x00888888
							if (x < 127 && x < 63) this.frame[pos + 129] ^= 0x00888888
						}
					}
					spr = (spr << 1) & 0xff
				}
			}
		}
	}

	step(callback) {
		if (this.next(callback)) {
			return [2, 1, null]
		}
		ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 128))

		return [0, 1, null]
	}

	next(callback) {
		const p = this.pc
		this.pc += 2

		const h = this.ram[p]
		const l = this.ram[p + 1]
		const instr = h << 8 | l
		const opcode = instr >> 12

		switch (opcode) {
		case 0:
			if (h == 0 && ((l >> 4) == 0xc)) {
				const shift = (l & 0xf) * (this.hires ? 1 : 2)
				this.frame.copyWithin(shift * 128, 0, 128 * (64 - shift))
				this.frame.fill(0xff000000, 0, shift * 128)
				break
			}
			if (h == 0 && ((l >> 4) == 0xd)) {
				const shift = (l & 0xf) * (this.hires ? 1 : 2)
				this.frame.copyWithin(0, shift * 128)
				this.frame.fill(0xff000000, 128 * (64 - shift))
				break
			}
			switch(instr) {
				case 0x00E0: {
					this.frame.fill(0xff000000)
					ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 128))
					break
				}
				case 0x00EE: {
					this.pc = this.stack[this.sp]
					this.sp = (this.sp - 1) & 0xf
					break
				}
				case 0x00fb: {
					const shift = this.hires ? 4 : 8
					for(let i = 0; i < 64; i += 1) {
						this.frame.copyWithin(i * 128 + shift, i * 128, i * 128 + 128 - shift)
						this.frame.fill(0xff000000, i * 128, i * 128 + shift)
					}
					break
				}
				case 0x00fc: {
					const shift = this.hires ? 4 : 8
					for(let i = 0; i < 64; i += 1) {
						this.frame.copyWithin(i * 128, i * 128 + shift, i * 128 + 128)
						this.frame.fill(0xff000000, i * 128 - shift, i * 128)
					}
					break
				}
				case 0x00fd: {
					RuntimeManager.break()
					break
				}
				case 0x00fe: {
					this.hires = false
					break
				}
				case 0x00ff: {
					this.hires = true
					break
				}
			}
			break;
		case 1:
			this.pc = instr & 0x0fff
			break;
		case 2:
			this.sp = (this.sp + 1) & 0xf
			this.stack[this.sp] = this.pc
			this.pc = instr & 0x0fff
			break;
		case 3:
			if (this.v[h & 0xf] == l) {
				this.pc += 2
			}
			break;
		case 4:
			if (this.v[h & 0xf] != l) {
				this.pc += 2
			}
			break;
		case 5:
			switch (l & 0xf) {
			case 0:
				if (this.v[h & 0xf] == this.v[l >> 4]) {
					this.pc += 2
				}
				break
			case 2: {
				const x = h & 0xf
				const y = l >> 4
				if (x >= y) {
					for(let idx = x; idx <= y; idx++) {
						this.ram[this.i & 0xffff] = this.v[idx]
						this.i++
					}
				} else {
					for(let idx = y; idx <= x; idx++) {
						this.ram[this.i & 0xffff] = this.v[idx]
						this.i++
					}
				}
				break
			}
			case 3: {
				const x = h & 0xf
				const y = l >> 4
				if (x >= y) {
					for(let idx = x; idx <= y; idx++) {
						this.v[idx] = this.ram[this.i & 0xffff]
						this.i++
					}
				} else {
					for(let idx = y; idx <= x; idx++) {
						this.v[idx] = this.ram[this.i & 0xffff]
						this.i++
					}
				}
				break
			}
			}
			break;
		case 6:
			this.v[h & 0xf] = l
			break;
		case 7:
			this.v[h & 0xf] += l
			break;
		case 8: {
			const addr = h & 0xf
			const b = this.v[l >> 4]
			switch (l & 0xf) {
			case 0: {
				this.v[addr] = b
				break
			}
			case 1: {
				this.v[addr] |= b
				this.v[0xf] = 0
				break
			}
			case 2: {
				this.v[addr] &= b
				this.v[0xf] = 0
				break
			}
			case 3: {
				this.v[addr] ^= b
				this.v[0xf] = 0
				break
			}
			case 4: {
				const a = this.v[addr]
				this.v[addr] += b
				this.v[0xF] = a + b > 0xff
				break
			}
			case 5: {
				const a = this.v[addr]
				this.v[addr] -= b
				this.v[0xF] = a >= b
				break
			}
			case 6: {
				const a = this.v[addr]
				this.v[addr] >>>= 1
				this.v[0xF] = a & 1
				break
			}
			case 7: {
				const a = this.v[addr]
				this.v[addr] = b - a
				this.v[0xF] = a <= b
				break
			}
			case 0xe: {
				const a = this.v[addr]
				this.v[addr] <<= 1
				this.v[0xF] = a >> 7
				break
			}
			}
			break;
		}
		case 9:
			if (this.v[h & 0xf] != this.v[l >> 4]) {
				this.pc += 2
			}
			break;
		case 0xa:
			this.i = instr & 0x0fff
			break;
		case 0xb:
			this.pc = (this.v[0] + (instr & 0xffff))
			break;
		case 0xc:
			this.v[h & 0xf] = ((Math.random() * 256) | 0) & l
			break;
		case 0xd: {
			if ((l & 0xf) == 0) {
				if (this.hires || true) {
					const x = this.v[h & 0xf] << 24 >> 24
					const y = this.v[l >> 4] << 24 >> 24
					this.v[0xf] = 0

					for(let row = 0; row < 16; row += 1) {
						let spr = this.ram[(this.i + row * 2) & 0xffff]
						for(let column = 0; column < 8; column += 1) {
							const px = x + column
							const py = y + row
							if (px >= 0 && px < 128 && py >= 0 && py < 64 && (spr & 0b10000000)) {
								const pos = (py << 7) | px
								if ((this.frame[pos] & 0xff777777) && this.frametop) {
									this.v[0xf] = 1
								}
								if ((this.frame[pos] & 0xff888888) && this.framebottom) {
									this.v[0xf] = 1
								}
								if (this.frametop) {
									this.frame[pos] ^= 0x00ffffff
								}
								if (this.framebottom) {
									this.frame[pos] ^= 0x00888888
								}
							}
							spr = (spr << 1) & 0xff
						}
						spr = this.ram[(this.i + row * 2 + 1) & 0xffff]
						for(let column = 0; column < 8; column += 1) {
							const px = x + column + 8
							const py = y + row
							if (px >= 0 && px < 128 && py >= 0 && py < 64 && (spr & 0b10000000)) {
								const pos = (py << 7) | (px)
								if ((this.frame[pos] & 0xff777777) && this.frametop) {
									this.v[0xf] = 1
								}
								if ((this.frame[pos] & 0xff888888) && this.framebottom) {
									this.v[0xf] = 1
								}
								if (this.frametop) {
									this.frame[pos] ^= 0x00ffffff
								}
								if (this.framebottom) {
									this.frame[pos] ^= 0x00888888
								}
							}
							spr = (spr << 1) & 0xff
						}
					}
				} else {
					const x = this.v[h & 0xf]
					const y = this.v[l >> 4]
					const rows = 16
					this.v[0xf] = 0
					this.drawSprite(x, y, this.i, rows)
				}
				ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 128))
				break
			}
			const x = this.v[h & 0xf]
			const y = this.v[l >> 4]
			const rows = l & 0xf
			this.v[0xf] = 0
			this.drawSprite(x, y, this.i, rows)
			ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 128))
			break;
		}
		case 0xe:
			if (l >> 4 == 9) {
				if (KeyboardDevice.isPressed(keys[this.v[h & 0xf] & 0xf])) {
					this.pc += 2
				}
			} else {
				if (!KeyboardDevice.isPressed(keys[this.v[h & 0xf] & 0xf])) {
					this.pc += 2
				}
			}
			break;
		case 0xf: {
			if (instr == 0xf000) {
				this.pc += 2
				const h2 = this.ram[p + 2]
				const l2 = this.ram[p + 3]
				this.i = h2 << 8 | l2
				break
			}
			const addr = h & 0xf
			switch (l) {
			case 0x01:
				this.frametop = addr & 0b10
				this.framebottom = addr & 0b01
				break
			case 0x07:
				this.v[addr] = this.delay
				break
			case 0x0A:
				if (callback === undefined) {
					this.pc -= 2
					addEventListener("keydown", keyCallback)
					return true
				} else {
					this.v[addr] = callback
					callback = undefined
				}
				break
			case 0x15:
				this.delay = this.v[addr]
				break
			case 0x18:
				this.sound = this.v[addr]
				break
			case 0x1e:
				this.i += this.v[addr]
				break
			case 0x29:
				this.i = (this.v[addr] & 0xf) * 5;
				break
			case 0x30:
				this.i = ((this.v[addr] & 0xf) * 10) + 80;
				break
			case 0x33: {
				const n = this.v[addr]
				this.ram[this.i] = (n / 100) | 0
				this.ram[(this.i + 1) & 0xffff] = (n % 100 / 10) | 0
				this.ram[(this.i + 2) & 0xffff] = n % 10
				break
			}
			case 0x55:
				for(let idx = 0; idx <= addr; idx++) {
					this.ram[this.i & 0xffff] = this.v[idx]
					this.i++
				}
				break
			case 0x65:
				for(let idx = 0; idx <= addr; idx++) {
					this.v[idx] = this.ram[this.i & 0xffff]
					this.i++
				}
				break
			}
			break;
		}
		}

		this.pc &= 0xffff
		this.i &= 0xffff
	}

	burst(duration, callback) {
		let c = 0
		if (this.speed > 0) {
			for (let j = 0; j < this.speed; j++) {
				c += 1
				if (this.next(callback)) {
					return [2, c, null]
				}
				callback = undefined
			}
		} else {
			const end = performance.now() + duration
			while(performance.now() < end) {
				for (let j = 0; j < 5000; j++) {
					c += 1
					if (this.next(callback)) {
						return [2, c, null]
					}
					callback = undefined
				}
			}
		}
		ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 128))
		this.delay = Math.max(this.delay - 1, 0)
		this.sound = Math.max(this.sound - 1, 0)

		return [0, c, null]
	}

}

const Octo = function(){
	class OctoEditor {
		editor
		editorpre

		markedline = -1

		constructor() {
			this.editorpre = document.createElement("pre")
			this.editorpre.className = "editor"
			//this.editorpre.id = path
			this.editor = ace.edit(this.editorpre)
        	this.editor.setOptions({useWorker: false})
			this.editorpre.classList.add("hidden")
	        this.editor.session.setMode("ace/mode/octo");
		}

		getElement() {return this.editorpre}

		getValue(){ return this.editor.getValue()}

		async setValue(value){ return this.editor.setValue(await value.text(), -1)}

		onChangeHook(f) {
			this.editor.getSession().on("change", f)
		}

		setAnnotations(annotations) {
			this.editor.getSession().setAnnotations(annotations)
		}


		markCurrentLine(line) {
			this.editor.getSession().removeGutterDecoration(this.markedline, "current-executed-line-marker")
			this.editor.getSession().addGutterDecoration(line, "current-executed-line-marker")
			this.markedline = line
		}

		removeCurrentLineMarker() {
			this.editor.getSession().removeGutterDecoration(this.markedline, "current-executed-line-marker")
			this.markedline = -1
		}

		compiles() {return true}


		compile() {
			const c = new OctoCompiler(this.editor.getValue())
			c.go()
			const rom = new Uint8Array(0xffff+1)
			console.log(c, c.rom)
			for(let i = 0; i < c.rom.length && i + 0x200 <= 0xffff; i++) {
				rom[i + 0x200] = c.rom[i]
			}

			const fontset =
			[
				//small font
				0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
				0x20, 0x60, 0x20, 0x20, 0x70, // 1
				0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
				0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
				0x90, 0x90, 0xF0, 0x10, 0x10, // 4
				0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
				0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
				0xF0, 0x10, 0x20, 0x40, 0x40, // 7
				0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
				0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
				0xF0, 0x90, 0xF0, 0x90, 0x90, // A
				0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
				0xF0, 0x80, 0x80, 0x80, 0xF0, // C
				0xE0, 0x90, 0x90, 0x90, 0xE0, // D
				0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
				0xF0, 0x80, 0xF0, 0x80, 0x80, // F

				//big font
				0xFF, 0xFF, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, // 0
				0x18, 0x78, 0x78, 0x18, 0x18, 0x18, 0x18, 0x18, 0xFF, 0xFF, // 1
				/*

				0b 00011000 01111000 01111000 00011000 00011000 00011000 00011000 00011000 11111111 11111111

				*/
				0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // 2
				0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 3
				0xC3, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0x03, 0x03, // 4
				0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 5
				0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 6
				0xFF, 0xFF, 0x03, 0x03, 0x06, 0x0C, 0x18, 0x18, 0x18, 0x18, // 7
				0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, // 8
				0xFF, 0xFF, 0xC3, 0xC3, 0xFF, 0xFF, 0x03, 0x03, 0xFF, 0xFF, // 9
				0x7E, 0xFF, 0xC3, 0xC3, 0xC3, 0xFF, 0xFF, 0xC3, 0xC3, 0xC3, // A
				0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, 0xC3, 0xC3, 0xFC, 0xFC, // B
				0x3C, 0xFF, 0xC3, 0xC0, 0xC0, 0xC0, 0xC0, 0xC3, 0xFF, 0x3C, // C
				0xFC, 0xFE, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xC3, 0xFE, 0xFC, // D
				0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, // E
				0xFF, 0xFF, 0xC0, 0xC0, 0xFF, 0xFF, 0xC0, 0xC0, 0xC0, 0xC0, // F
			]

			const fontsetsmall = [
				0b01110000, 0b00100000, 0b01110000, 0b01110000, 0b10001000, 0b11111000, 0b01110000, 0b11111000, 
				0b10001000, 0b01100000, 0b10001000, 0b10001000, 0b10001000, 0b10000000, 0b10000000, 0b00001000, 
				0b10001000, 0b00100000, 0b00110000, 0b00110000, 0b11111000, 0b11110000, 0b11110000, 0b00010000, 
				0b10001000, 0b00100000, 0b01000000, 0b10001000, 0b00001000, 0b00001000, 0b10001000, 0b00100000, 
				0b01110000, 0b01110000, 0b11111000, 0b01110000, 0b00001000, 0b11110000, 0b01110000, 0b00100000, 

				0b01110000, 0b01110000, 0b01110000, 0b11110000, 0b01110000, 0b11110000, 0b11111000, 0b11111000, 
				0b10001000, 0b10001000, 0b10001000, 0b10001000, 0b10001000, 0b10001000, 0b10000000, 0b10000000, 
				0b01110000, 0b01111000, 0b11111000, 0b11110000, 0b10000000, 0b10001000, 0b11110000, 0b11110000, 
				0b10001000, 0b00001000, 0b10001000, 0b10001000, 0b10001000, 0b10001000, 0b10000000, 0b10000000, 
				0b01110000, 0b01110000, 0b10001000, 0b11110000, 0b01110000, 0b11110000, 0b11111000, 0b10000000, 
			]

			const fontsetbig = [
				0b01111100, 0b00010000, 0b01111100, 0b01111100, 0b10000010, 0b11111110, 0b01111110, 0b11111110, 
				0b10000010, 0b00110000, 0b10000010, 0b10000010, 0b10000010, 0b10000000, 0b10000000, 0b00000010, 
				0b10000010, 0b01010000, 0b10000010, 0b00000010, 0b10000010, 0b10000000, 0b10000000, 0b00000100, 
				0b10000010, 0b00010000, 0b00000100, 0b00000010, 0b10000010, 0b10000000, 0b10000000, 0b00000100, 
				0b10000010, 0b00010000, 0b00001000, 0b00111100, 0b11111110, 0b11111100, 0b11111100, 0b00001000, 
				0b10000010, 0b00010000, 0b00010000, 0b00000010, 0b00000010, 0b00000010, 0b10000010, 0b00001000, 
				0b10000010, 0b00010000, 0b00100000, 0b00000010, 0b00000010, 0b00000010, 0b10000010, 0b00001000, 
				0b10000010, 0b00010000, 0b01000000, 0b00000010, 0b00000010, 0b00000010, 0b10000010, 0b00010000, 
				0b10000010, 0b00010000, 0b10000000, 0b10000010, 0b00000010, 0b10000010, 0b10000010, 0b00010000, 
				0b01111100, 0b11111110, 0b11111110, 0b01111100, 0b00000010, 0b01111100, 0b01111100, 0b00010000, 

				0b01111100, 0b01111100, 0b01111100, 0b11111100, 0b01111100, 0b11111100, 0b11111110, 0b11111110, 
				0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000000, 0b10000000, 
				0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000000, 0b10000010, 0b10000000, 0b10000000, 
				0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000000, 0b10000010, 0b10000000, 0b10000000, 
				0b01111100, 0b01111110, 0b11111110, 0b11111100, 0b10000000, 0b10000010, 0b11111100, 0b11111100, 
				0b10000010, 0b00000010, 0b10000010, 0b10000010, 0b10000000, 0b10000010, 0b10000000, 0b10000000, 
				0b10000010, 0b00000010, 0b10000010, 0b10000010, 0b10000000, 0b10000010, 0b10000000, 0b10000000, 
				0b10000010, 0b00000010, 0b10000010, 0b10000010, 0b10000000, 0b10000010, 0b10000000, 0b10000000, 
				0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000010, 0b10000000, 0b10000000, 
				0b01111100, 0b01111100, 0b10000010, 0b11111100, 0b01111100, 0b11111100, 0b11111110, 0b10000000, 
			]

			for(let i = 0; i < fontset.length; i++) {
				rom[i] = fontset[i]
			}

			for(let char = 0; char < 16; char ++) {
				for(let row = 0; row < 5; row++) {
					rom[char * 5 + row] = fontsetsmall[row * 8 + char + 32 * (char > 7)]
				}
			}
			for(let char = 0; char < 16; char ++) {
				for(let row = 0; row < 10; row++) {
					rom[char * 10 + row + 80] = fontsetbig[row * 8 + char + 72 * (char > 7)]
				}
			}

        	document.querySelector("input#screenwidth").value = 128
        	document.querySelector("input#screenwidth").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("input#screenheight").value = 64
        	document.querySelector("input#screenheight").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("select#screencolormode").value = "RGBA8888"
        	document.querySelector("select#screencolormode").dispatchEvent(new Event('change', { bubbles: true }))

			return new Chip8Interpreter(rom, c.constants.__SPEED ?? 720)
		}
	}

	window.registerExtension("8o", OctoEditor)
}()


describeFormat("Chip-8", `CHIP-8 is an interpreted programming language, developed by Joseph Weisbecker on his 1802 microprocessor`)
