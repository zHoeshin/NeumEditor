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
		this.buffer = new Uint32Array(64 * 32)
		this.frame = new Uint32Array(64 * 32)
		this.frame.fill(0xff000000)
		this.speed = spd > 0 ? spd / 60 : -1
	}

	dispose() {
		removeEventListener("keydown", keyCallback)
	}

	markCurrentLine(){}
	getLine(){}

	step(callback) {
		if (this.next(callback)) {
			return [2, 1, null]
		}
		ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 64))

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
			if (instr == 0x00E0) {
				this.frame.fill(0xff000000)
				ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 64))
				break
			}
			if (instr == 0x00EE) {
				this.pc = this.stack[this.sp]
				this.sp = (this.sp - 1) & 0xf
				break
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
			if (this.v[h & 0xf] == this.v[l >> 4]) {
				this.pc += 2
			}
			break;
		case 6:
			this.v[h & 0xf] = l
			break;
		case 7:
			this.v[h & 0xf] += l
			break;
		case 8:
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
		case 9:
			if (this.v[h & 0xf] != this.v[l >> 4]) {
				this.pc += 2
			}
			break;
		case 0xa:
			this.i = instr & 0xfff
			break;
		case 0xb:
			this.pc = (this.v[0] + (instr & 0xfff))
			break;
		case 0xc:
			this.v[h & 0xf] = ((Math.random() * 256) | 0) & l
			break;
		case 0xd:
			const x = this.v[h & 0xf]
			const y = this.v[l >> 4]
			const rows = l & 0xf
			this.v[0xf] = 0
			for(let row = 0; row < rows; row++) {
				let spr = this.ram[(this.i + row) & 0xfff]
				for(let column = 0; column < 8; column += 1) {
					if (spr & 0b10000000) {
						const pos = (((y + row) & 0b11111) << 6) | ((x + column) & 0b111111)
						if (this.frame[pos] == 0xffffffff) {
							this.v[0xf] = 1
						}
						this.frame[pos] ^= 0x00ffffff
					}
					spr = (spr << 1) & 0xff
				}
			}
			ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 64))
			break;
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
			const addr = h & 0xf
			switch (l) {
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
				this.i = this.v[addr] * 5;
				break
			case 0x33:
				const n = this.v[addr]
				this.ram[this.i] = (n / 100) | 0
				this.ram[(this.i + 1) & 0xfff] = (n % 100 / 10) | 0
				this.ram[(this.i + 2) & 0xfff] = n % 10
				break
			case 0x55:
				for(let idx = 0; idx < addr; idx++) {
					this.ram[this.i & 0xfff] = this.v[idx]
					this.i++
				}
				break
			case 0x65:
				for(let idx = 0; idx < addr; idx++) {
					this.v[idx] = this.ram[this.i & 0xfff]
					this.i++
				}
				break
			}
			break;
		}
		}

		this.pc &= 0xfff
		this.i &= 0xfff
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
		ScreenDevice.putImageData(new ImageData(new Uint8ClampedArray(this.frame.buffer), 64))
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
			const rom = new Uint8Array(0xfff + 1)
			console.log(c, c.rom)
			for(let i = 0; i < c.rom.length && i + 0x200 <= 0xfff; i++) {
				rom[i + 0x200] = c.rom[i]
			}

			const fontset =
			[
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
				0xF0, 0x80, 0xF0, 0x80, 0x80  // F
			];

			for(let i = 0; i < fontset.length; i++) {
				rom[i] = fontset[i]
			}

        	document.querySelector("input#screenwidth").value = 64
        	document.querySelector("input#screenwidth").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("input#screenheight").value = 32
        	document.querySelector("input#screenheight").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("select#screencolormode").value = "RGBA8888"
        	document.querySelector("select#screencolormode").dispatchEvent(new Event('change', { bubbles: true }))

			return new Chip8Interpreter(rom, c.constants.__SPEED ?? 720)
		}
	}

	window.registerExtension("8o", OctoEditor)
}()


describeFormat("Chip-8", `CHIP-8 is an interpreted programming language, developed by Joseph Weisbecker on his 1802 microprocessor`)
