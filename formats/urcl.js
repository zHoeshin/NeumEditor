const PORTS = {
	"CPUBUS": 0,
	"TEXT": 1,
	"NUMB": 2,
	"SUPPORTED": 5,
	"SPECIAL": 6,
	"PROFILE": 7,
	"X": 8,
	"Y": 9,
	"COLOR": 10,
	"COLOUR": 10,
	"BUFFER": 11,
	"FREEZE": 12,
	"UNFREEZE": 13,
	"CLEAR": 14,
	"GSPECIAL": 15,
	"ASCII8": 16,
	"CHAR5": 17,
	"CHAR6": 18,
	"ASCII7": 19,
	"UTF8": 20,
	"TSPECIAL": 23,
	"INT": 24,
	"UINT": 25,
	"BIN": 26,
	"HEX": 27,
	"FLOAT": 28,
	"FIXED": 29,
	"N-SPECIAL": 31,
	"ADDR": 32,
	"BUS": 33,
	"PAGE": 34,
	"SSPECIAL": 39,
	"RNG": 40,
	"NOTE": 41,
	"INSTR": 42,
	"NLEG": 43,
	"WAIT": 44,
	"NADDR": 45,
	"DATA": 46,
	"MSPECIAL": 47,
	"UD1": 48,
	"UD2": 49,
	"UD3": 50,
	"UD4": 51,
	"UD5": 52,
	"UD6": 53,
	"UD7": 54,
	"UD8": 55,
	"UD9": 56,
	"UD10": 57,
	"UD11": 58,
	"UD12": 59,
	"UD13": 60,
	"UD14": 61,
	"UD15": 62,
	"UD16": 63,


	"MOUSE_X": 70,
	"MOUSE_Y": 71,
	"MOUSE_DX": 72,
	"MOUSE_DY": 73,
	"MOUSE_WHEEL": 74,
	"MOUSE_BUTTONS": 75,

	"CURKEY": 65,
	"CURKEYCODE": 66,
	"KEY": 67,
	"CURCODEPOINT": 68,
	"GAMEPAD": 80,
};

function mp2(n) {
	return 2 ** Math.ceil(Math.log2(n))
}

class URCLMachine {
	constructor (data, max_duration, callback_return_value, step, run, instructionlines, dwstart, editor, headers) {
		this.pc = 0
		this.memorysize = mp2(headers.MINHEAP + data.length + headers.MINSTACK)
		this.memorymask = this.memorysize - 1
		this.sp = this.memorysize
		if (headers.BITS == 8) {
			this.registers = new Uint8Array(headers.MINREG + 2).fill(0)
		} else if (headers.BITS == 16) {
			this.registers = new Uint16Array(headers.MINREG + 2).fill(0)
		} else if (headers.BITS == 32) {
			this.registers = new Uint32Array(headers.MINREG + 2).fill(0)
		} else {
			this.registers = new Uint32Array(headers.MINREG + 2).fill(0)
		}
		if (headers.BITS == 8) {
			this.memory = new Uint8Array(this.memorysize)
		} else if (headers.BITS == 16) {
			this.memory = new Uint16Array(this.memorysize)
		} else if (headers.BITS == 32) {
			this.memory = new Uint32Array(this.memorysize)
		} else {
			this.memory = new Uint32Array(this.memorysize)
		}
		let i = 0
		for (let b of data) {
			this.memory[i] = b
			i ++	
		}
		this.memoryview = new DataView(this.memory.buffer)
		this.step =  Function(callback_return_value, step)
		this.x = 0
		this.y = 0
		this.buffer = true
		this.wait = 0
		this.frozendisplay = false
		this.burst =  Function(max_duration, callback_return_value, run)
		this.bits = headers.BITS
		this.mask = 2 ** this.bits - 1;
		this.msb = 2 ** (this.bits - 1);
		this.maxp1 = 2 ** this.bits
		this.maxsigned = (2 ** (this.bits - 1)) - 1
		this.signconv = 2 ** (this.bits - 1)
		this.pc2line = instructionlines
		this.editor = editor
		this.markedline = 0
	}

	async initDrive(drive) {
		this.drive = drive
		this.drivehandle = drive?.handle
		const f = await this.drivehandle?.getFile()
		if (this.bits == 8) {
			this.driveContents = new Uint8Array(await f.arrayBuffer())
		} else if (this.bits == 16) {
			this.driveContents = new Uint16Array(await f.arrayBuffer())
		} else if (this.bits == 32) {
			this.driveContents = new Uint32Array(await f.arrayBuffer())
		} else {
			this.driveContents = new Uint32Array(await f.arrayBuffer())
		}
		this.addr = 0
		this.page = 0
		return this
	}

	async dispose() {
		const w = await this.drivehandle?.createWritable()
		if (!w) {
			return
		}
		await w.write(this.driveContents)
	}

	markCurrentLine(line) {
		// this.editor.getSession().removeGutterDecoration(this.markedline, "current-executed-line-marker")

		// const dec = this.editor.getSession()._gutterDecorations;

		// const session = this.editor.getSession()

		// if (!dec) {
		// 	session.addGutterDecoration(line, "current-executed-line-marker")
		// 	this.markedline = line
		// 	return
		// }

		// for (let row of Object.keys(dec)) {
		// 	const classNames = dec[row];
		// 	if (!classNames) {
		// 		continue
		// 	}

		// 	for (let className of Object.keys(classNames)) {
		// 		session.removeGutterDecoration(Number(row), className);
		// 	}
		// }

		// session.addGutterDecoration(line, "current-executed-line-marker")
		// this.markedline = line

		this.editor.getSession().$decorations = []
		this.editor.getSession().addGutterDecoration(line, "current-executed-line-marker")
		this.markedline = line
	}

	toSigned(value) {
	    /*value = value & this.mask;
	    if (value & this.msb) {
	        return value - this.signconv;
	    }
	    return value;*/
	    //return (value ^ this.msb) - this.msb
        // if (this.bits === 32){
        //     return 0| value;
        // }
        // return (value & this.msb) === 0 ? value : value | (0xffff_ffff << this.bits);
		
		// return value << (32 - this.bits) >> (32 - this.bits)

		return (value & this.msb) ? value - this.maxp1 : value
	}

	toUnsigned(value) {
	    return value & this.mask;
	}

	getLine() {
		return this.pc2line[this.pc] ?? -1
	}

	pushMemory(value) {
        // if (this.sp !== 0 && this.sp <= -1 ){ //this.memorysize){
        //     console.error(`Stack overflow: ${this.sp} <= ${this.memorysize}}`);
        //     this.sp = 0
        //     return 0
        // }
        this.sp = this.sp - 1
        this.memory[this.sp & this.memorymask] = value;

        return 0
    }
    popMemory() {
        // if (this.sp >= this.memorysize){
        //     console.error(`Stack underflow: ${this.sp} >= ${this.memorysize}`);
        //     this.sp = this.memorysize - 1
        //     return 0
        // }
        const value = this.memory[this.sp & this.memorymask];
        this.sp = this.sp + 1

        return value;
    }

    setMemory(addr, value){
        // if (addr >= this.memorysize){
        //     console.error(`Heap overflow on store: ${addr} >= ${this.memorysize}`);
        //     return 0
        // }
        this.memory[addr & this.memorymask] = value;
    
        return 0
    }
    getMemory(addr){
        // if (addr >= this.memorysize){
        //     console.error(`Heap overflow on load: ${addr} >= ${this.memorysize}`);
        //     return 0
        // }
        // console.warn(this.memory[addr], "at", addr)
        return this.memory[addr & this.memorymask];
    }

	readPort(port) {
		switch (port) {
		case PORTS.X:
			return ScreenDevice.getWidth()
			break
		case PORTS.Y:
			return ScreenDevice.getHeight()
			break
		case PORTS.COLOR:
			return ScreenDevice.getPixel(this.x, this.y) ?? 0
		case PORTS.CLEAR:
			ScreenDevice.clear()
			break
		case PORTS.BUFFER:
			return this.buffer
		case PORTS.WAIT:
			return ()=>TimerDevice.wait(this.wait)
		case PORTS.RNG:
			return (Math.random() * this.mask) | 0
		case PORTS.MOUSE_X:
			return MouseDevice.getX()
			break;
		case PORTS.MOUSE_Y:
			return MouseDevice.getY()
			break;
		case PORTS.MOUSE_DX:
			return MouseDevice.getSpeedX()
			break;
		case PORTS.MOUSE_DY:
			return MouseDevice.getSpeedY()
			break;
		case PORTS.MOUSE_BUTTONS:
			return MouseDevice.getButtons()	
			break;
		case PORTS.GAMEPAD:
			return KeyboardDevice.getPad()
			break
		case PORTS.TEXT:
			return ConsoleDevice.getInputChar()
		case PORTS.CURKEY:
			return ([KeyboardDevice.getCurrentUSB(), KeyboardDevice.setCurrentUSB(0)][0])
		case PORTS.CURKEYCODE:
			return ([KeyboardDevice.getCurrentKeycode(), KeyboardDevice.setCurrentKeycode(0)][0])
		case PORTS.CURCODEPOINT:
			return ([KeyboardDevice.getCurrentCodepoint(), KeyboardDevice.setCurrentCodepoint(0)][0])
		case PORTS.KEY:
			return KeyboardDevice.getAtOffsetPacked(this.bits)
			break;
		case PORTS.ADDR:
			return this.addr
		case PORTS.PAGE:
			return this.page
		case PORTS.BUS:
			return this.driveContents[this.page << this.bits + this.addr]
		default:
			return null
		}
	}

	writePort(port, value) {
		switch (port) {
		case PORTS.X:
			this.x = value
			break
		case PORTS.Y:
			this.y = value
			break
		case PORTS.COLOR:
			ScreenDevice.setPixel(this.x, this.y, value)
			if (!this.buffer) {
				ScreenDevice.swap()
			}
			break
		case PORTS.CLEAR:
			ScreenDevice.clear()
			break
		case PORTS.BUFFER:
			switch(value) {
			case 0:
				// ScreenDevice?.clear()
				ScreenDevice.swap()
				ScreenDevice.flush()
				ScreenDevice.clearBuffer()
				this.buffer = false
				break;
			case 1:
				this.buffer = true
				break;
			case 2:
				ScreenDevice?.swap()
				// ScreenDevice?.clearBuffer()
				break;
			}
			break
		case PORTS.WAIT:
			this.wait = value
			break
		case PORTS.KEY:
			KeyboardDevice.setOffset(value)
			break
		case PORTS.TEXT:
			ConsoleDevice.outCodePoint(value)
			break
		case PORTS.NUMB:
			for(const char of `${value}`) {
				ConsoleDevice.outChar(char)
			}
			break
		case PORTS.ADDR:
			this.addr = value
			break
		case PORTS.PAGE:
			this.page = value
			break
		case PORTS.BUS:
			this.driveContents[this.page << this.bits + this.addr] = value
			return
		}
	}
}

const URCL = function(){
	ace.define("ace/mode/urcl_highlight_rules", ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"], function(require, exports) {
	    "use strict";

	    var oop = require("ace/lib/oop");
	    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

	    var UrclHighlightRules = function() {
	        var headers = [
	            "BITS", "MINREG", "MINHEAP", "MINSTACK", "RUN"
	        ];

	        this.$rules = {
	            "start": [
	                {
	                    token: "comment",
	                    regex: "\\/\\/.*$"
	                },
	                {
	                    token: "comment.block",
	                    regex: "\\/\\*",
	                    next: "comment"
	                },
	                {
	                    token: "string.quoted",
	                    regex: "'[^']*'"
	                },
	                {
	                    token: "constant.numeric.hex",
	                    regex: "0x[0-9a-fA-F]+(:(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "constant.numeric.binary", 
	                    regex: "0b[01]+(:(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "constant.numeric.octal",
	                    regex: "0o[0-7]+(:(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "constant.numeric",
	                    regex: "\\b\\d+(:(\d+)|[WwBbAa])?\\b"
	                },
	                {
	                	token: "constant.language",
	                	regex: "\\b(SP|PC|sp|pc(.(\d+)|[WwBbAa])?)\\b"
	                },
	                {
	                    token: "variable.parameter",
	                    regex: "\\b[Rr$]\\d+(.(\d+)|[WwBbAa])?\\b"
	                },
	                {
	                    token: "storage.modifier",
	                    regex: "\\b[Mm#]\\d+(.(\d+)|[WwBbAa])?\\b"
	                },
	                {
	                    token: "entity.name.label",
	                    regex: "\\.[a-zA-Z_][a-zA-Z0-9_]*(:(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "constant.character",
	                    regex: "~[+-]\\d+(.(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "support.constant",
	                    regex: "%[a-zA-Z_][a-zA-Z0-9_]*(.(\d+)|[WwBbAa])?"
	                },
	                {
	                    token: "variable.language",
	                    regex: "@[A-Za-z_-]+\\b(.(\d+)|[WwBbAa])?"
	                },
	                {
	                	token: "keyword.control",
	                	regex: "\\bBITS|MINREG|MINHEAP|MINSTACK|RUN(.(\d+)|[WwBbAa])?\\b",
	                	caseInsensitive: true
	                },
	                {
	                    token: "support.function",
	                    regex: "\\b([a-zA-Z_][a-zA-Z0-9_]*(.(\d+)|[WwBbAa])?)\\b"
	                },
	                {
	                    token: "text",
	                    regex: "\\s+"
	                }
	            ],
	            "comment": [
	                {
	                    token: "comment.block",
	                    regex: "\\*\\/",
	                    next: "start"
	                },
	                {
	                    defaultToken: "comment.block"
	                }
	            ]
	        };
	    };

	    oop.inherits(UrclHighlightRules, TextHighlightRules);
	    exports.UrclHighlightRules = UrclHighlightRules;
	});

	ace.define("ace/mode/urcl", ["require", "exports", "ace/lib/oop", "ace/mode/text", "ace/mode/urcl_highlight_rules"], function(require, exports) {
	    "use strict";

	    var oop = require("ace/lib/oop");
	    var TextMode = require("./text").Mode;
	    var UrclHighlightRules = require("./urcl_highlight_rules").UrclHighlightRules;

	    var Mode = function() {
	        this.HighlightRules = UrclHighlightRules;
	        this.$behaviour = this.$defaultBehaviour;
	    };
	    
	    oop.inherits(Mode, TextMode);

	    (function() {
	        this.lineCommentStart = "//";
	        this.blockComment = { start: "/*", end: "*/" };
	        
	        this.$id = "ace/mode/urcl";
	    }).call(Mode.prototype);

	    exports.Mode = Mode;
	});

	

	class URCLEditor {
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
	        this.editor.session.setMode("ace/mode/urcl");
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

		async compile() {
			// // const lines = this.editor.getValue().match(/"(?:\\.|[^"\\])*(?:"|$)|[^\n]+/g).map(line => line.match(/"(?:\\.|[^"\\])*(?:"|$)|\S+/g))
			// const lines = (this.editor.getValue().replace(/\r\n/g, "\n")
			// 	.match(/(?:[^\n"'\[]|"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|\[(?:"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|[^\]])*(?:\]|$)|^$)+/gm) ?? [])
			// 	// .map(line => (line.replace(/\/\/[^\n]*$/gm, "") ?? "")
			// 	// .match(/"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|\[(?:"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|[^\]])*(?:\]|$)|[^\s\[]+/g) ?? [])
			// console.log(lines)

			// const linenumbers = []
			// let i = 1
			// for (let line of lines) {
			// 	linenumbers.push(i)
			// 	i += line.split("\n").length
			// }
			// console.log(linenumbers)

			const defaultErrorNumber = -1

			const annotations = []
			let unrecoverable = false

			const raw = this.editor.getValue()
			const L = raw.length

			const lines = []
			let line = []

			class Token {
				type
				value
				column
				row
				i
				constructor(_t, _v, _c, _r, _i) {
					this.type = _t
					this.value = _v
					this.row = _r
					this.column = _c
					this.i = _i
				}
				get key() {
					if (this.type == "def") return `def ${this.value.toUpperCase()}`
					if (this.type == "prt") return `prt ${this.value.toUpperCase()}`
					return `${this.type} ${this.value}`
				}
			}

			function escapeString(str) {
				return str.replace(
					/\\[0-9]|\\['"\bfnrtv]|\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\u\{[0-9a-f]+\}|\\./ig,
					match => {
						switch (match[1]) {
							case "'": case '"': case "\\": return match[1];
							case "b": return "\b"
							case "f": return "\f"
							case "n": return "\n"
							case "r": return "\r"
							case "t": return "\t"
							case "v": return "\v"
							case "u":
							if (match[2] === "{") {
								return String.fromCodePoint(parseInt(match.substring(3), 16))
							}
							return String.fromCharCode(parseInt(match.substring(2), 16))
							case "x": return String.fromCharCode(parseInt(match.substring(2), 16))
							case "0": return "\0"
							default:  return match.substring(1)
						}
					}
				)
			}

			let i = 0
			let column = 0
			let row = 0
			while (i < L) {
				const c = raw[i]
				const scolumn = column
				const srow = row
				const si = i
				if (c.match(/\s/)) {
					column += 1
					i += 1
					if (c == "\n") {
						column = 0
						row += 1
						lines.push(line)
						line = []
					}
					continue
				}
				if ("Rr$".includes(c)) {
					column += 1
					i += 1
					let numstr = ""
					let char = raw[i]
					if (! "0123456789".includes(char)) {
						i -= 1
						column -= 1
					} else {
						while (i < L && "0123456789_".includes(char)) {
							numstr += char
							i += 1
							column += 1
							char = raw[i]
						}
						line.push(new Token("reg", parseInt(numstr.replace(/_/g, "")), scolumn, srow, si))
						continue
					}
				}
				if ("Mm#".includes(c)) {
					column += 1
					i += 1
					let numstr = ""
					let char = raw[i]
					if (! "0123456789".includes(char)) {
						i -= 1
						column -= 1
					} else {
						while (i < L && "0123456789_".includes(char)) {
							numstr += char
							i += 1
							column += 1
							char = raw[i]
						}
						line.push(new Token("mem", parseInt(numstr.replace(/_/g, "")), scolumn, srow, si))
						continue
					}
				}
				if (c == "~") {
					column += 1
					i += 1
					let numstr = ""
					let char = raw[i]
					while (i < L && "+-0123456789_".includes(char)) {
						numstr += char
						i += 1
						column += 1
						char = raw[i]
					}
					line.push(new Token("rel", parseInt(numstr.replace(/_/g, "")), scolumn, srow, si))
					continue
				}
				if ("+-0123456789_".includes(c)) {
					let numstr = ""
					let char = raw[i]
					while (i < L && "+-0123456789abcdefABCDEF_bx".includes(char)) {
						numstr += char
						i += 1
						column += 1
						char = raw[i]
					}
					numstr = numstr.replace(/_/g, "")
					if (numstr.match(/^[+-]?\d+$/)) {
						line.push(new Token("num", parseInt(numstr, 10), scolumn, srow, si))
						continue
					}
					if (numstr.match(/^[+-]?0x[A-F0-9]+$/i)) {
						line.push(new Token("num", parseInt(numstr.replace(/0x/ig, ""), 16), scolumn, srow, si))
						continue
					}
					if (numstr.match(/^[+-]?0b[01]+$/i)) {
						line.push(new Token("num", parseInt(numstr.replace(/0b/ig, ""), 2), scolumn, srow, si))
						continue
					}
					if (numstr.match(/^[+-]?0o[01234567]+$/i)) {
						line.push(new Token("num", parseInt(numstr.replace(/0o/ig, ""), 8), scolumn, srow, si))
						continue
					}
					annotations.push({row: row + 1, column: column + 1, type: "error", text: `Unknown numeric literal type ${numstr}, default to ${defaultErrorNumber}`})
					line.push(new Token("num", defaultErrorNumber, scolumn, srow, si))
					continue
				}
				if (`'"`.includes(c)) {
					const escapes = {
						"n": "\n",
						"r": "\r",
						"t": "\t",
						"b": "\b",
						"f": "\f",
						"v": "\v",
						"0": "\0",
					}

					const quote = c
					let str = ""
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && char != quote) {
						i += 1
						column += 1
						str += char
						if (char == "\n") {
							column = 0
							row += 1
						}
						if (char == "\\") {
							if (i >= L) {
								annotations.push({row: row + 1, column: column + 1, type: "error", text: `Expected escape symbol, got EOF`})
								unrecoverable = true
								break
							} else {
								char = raw[i]
								str += char
								i += 1
								column += 1
								char = raw[i]
							}
						} else {
							char = raw[i]
						}
					}
					if (raw[i] != quote) {
						annotations.push({row: row + 1, column: column + 1, type: "error", text: `Expected closing quote, got EOF`})
						unrecoverable = true
					}
					i += 1
					column += 1
					line.push(new Token("str", escapeString(str), scolumn, srow, si))
					continue
				}
				if (c == "@") {
					let str = ""
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && !char.match(/[\s/]/)) {
						str += char
						i += 1
						column += 1
						char = raw[i]
					}
					line.push(new Token("def", str, scolumn, srow, si))
					continue
				}
				if (c == ".") {
					let str = ""
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && !char.match(/[\s/]/)) {
						str += char
						i += 1
						column += 1
						char = raw[i]
					}
					line.push(new Token("lbl", str, scolumn, srow, si))
					continue
				}
				if (c == "%") {
					let str = ""
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && !char.match(/[\s/]/)) {
						str += char
						i += 1
						column += 1
						char = raw[i]
					}
					line.push(new Token("prt", str, scolumn, srow, si))
					continue
				}
				if (c == "[") {
					let arr = []
					let char = raw[i]
					i += 1
					while (i < L && char != "]") {
						char = raw[i]
						if (char.match(/\s/)) {
							column += 1
							i += 1
							if (char == "\n") {
								column = 0
								row += 1
							}
							continue
						}
						if (char == "]") {
							i += 1
							column += 1
							break
						}
						if ("+-0123456789_".includes(char)) {
							let numstr = ""
							let char1 = raw[i]
							let scolumn = column
							let srow = row
							let si = i
							while (i < L && "+-0123456789abcdefABCDEF_bx".includes(char1)) {
								numstr += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
							numstr = numstr.replace(/_/g, "")
							if (numstr.match(/^[+-]?\d+$/)) {
								arr.push(new Token("num", parseInt(numstr, 10), scolumn, srow, si))
								continue
							}
							if (numstr.match(/^[+-]?0x[A-F0-9]+$/i)) {
								arr.push(new Token("num", parseInt(numstr.replace(/0x/ig, ""), 16), scolumn, srow, si))
								continue
							}
							if (numstr.match(/^[+-]?0b[01]+$/i)) {
								arr.push(new Token("num", parseInt(numstr.replace(/0b/ig, ""), 2), scolumn, srow, si))
								continue
							}
							if (numstr.match(/^[+-]?0o[01234567]+$/i)) {
								arr.push(new Token("num", parseInt(numstr.replace(/0o/ig, ""), 8), scolumn, srow, si))
								continue
							}
							annotations.push({row: row + 1, column: column + 1, type: "error", text: `Unknown numeric literal type ${numstr}, default to ${defaultErrorNumber}`})
							arr.push(new Token("num", defaultErrorNumber, scolumn, srow, si))
							continue
						}
						if (`'"`.includes(char)) {
							let scolumn = column
							let srow = row
							let si = i
							const escapes = {
								"n": "\n",
								"r": "\r",
								"t": "\t",
								"b": "\b",
								"f": "\f",
								"v": "\v",
								"0": "\0",
							}

							const quote = char
							let str = ""
							i += 1
							column += 1
							let char1 = raw[i]
							while (i < L && char1 != quote) {
								i += 1
								column += 1
								str += char1
								if (char1 == "\n") {
									column = 0
									row += 1
								}
								if (char1 == "\\") {
									if (i >= L) {
										annotations.push({row: row + 1, column: column + 1, type: "error", text: `Expected escape symbol, got EOF`})
										unrecoverable = true
										break
									} else {
										char1 = raw[i]
										str += char1
										i += 1
										column += 1
										char1 = raw[i]
									}
								} else {
									char1 = raw[i]
								}
							}
							if (raw[i] != quote) {
								annotations.push({row: row + 1, column: column + 1, type: "error", text: `Expected closing quote, got EOF`})
								unrecoverable = true
							}
							i += 1
							column += 1
							arr.push(new Token("str", escapeString(str), scolumn, srow, si))
							continue
						}
						if (char == "@") {
							let scolumn = column
							let srow = row
							let si = i
							let str = ""
							i += 1
							column += 1
							let char1 = raw[i]
							while (i < L && !char1.match(/[\s/]/)) {
								str += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
							arr.push(new Token("def", str, scolumn, srow, si))
							continue
						}
						if (char == ".") {
							let scolumn = column
							let srow = row
							let si = i
							let str = ""
							i += 1
							column += 1
							let char1 = raw[i]
							while (i < L && !char1.match(/[\s/]/)) {
								str += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
							arr.push(new Token("lbl", str, scolumn, srow, si))
							continue
						}
						if (char == "%") {
							let scolumn = column
							let srow = row
							let si = i
							let str = ""
							i += 1
							column += 1
							let char1 = raw[i]
							while (i < L && !char1.match(/[\s/]/)) {
								str += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
							arr.push(new Token("prt", str, scolumn, srow, si))
							continue
						}

						{
							let scolumn = column
							let srow = row
							let si = i
							let str = ""
							let char1 = raw[i]
							while (i < L && !char1.match(/\s/)) {
								if (char1 == "/") {
									let next = raw[i + 1]
									if (next == "/" || next =="*") {
										break
									}
								}
								str += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
						}
						arr.push(new Token("wrd", str, scolumn, srow, si))
					}
					line.push(new Token("arr", arr, scolumn, srow, si))
					continue
				}
				if (c == "/") {
					let next = raw[i + 1]
					let start = i
					if (next !== undefined) {
						if (next == "/") {
							i += 1
							column += 1
							let char = raw[i]
							while (i < L && char != "\n") {
								column += 1
								i += 1
								char = raw[i]
							}
							continue
						} else if (next == "*") {
							let end = raw.indexOf("*/", i)
							if (end == -1) {
								annotations.push({row: row + 1, column: column + 1, type: "error", text: `Multiline comment never closed`})
								i = raw.length
								continue
							}
							let str = raw.substring(start, end + 2)
							let l = str.split("\n")
							if (l.length > 1) {
								row += l.length - 1
								column = l.pop().length
							} else {
								column += str.length
							}
							i = end + 2
							continue
						}
					}
				}
				let str = ""
				let char = raw[i]
				while (i < L && !char.match(/\s/)) {
					if (char == "/") {
						let next = raw[i + 1]
						if (next == "/" || next =="*") {
							break
						}
					}
					str += char
					i += 1
					column += 1
					char = raw[i]
				}
				line.push(new Token("wrd", str, scolumn, srow, si))
				continue

			}
			lines.push(line)

			if (unrecoverable) {
				this.editor.getSession().setAnnotations(annotations)
				return
			}

			const instructions = []
			const data = []
			const labels = {}

			let definitions = {
				"BITS": new Token("num", 8, -1, -1, -1),
				"MINREG": new Token("num", 8, -1, -1, -1),
				"MINHEAP": new Token("num", 16, -1, -1, -1),
				"MINSTACK": new Token("num", 8, -1, -1, -1),
				"HEAP": new Token("num", 16, -1, -1, -1),
				"MSB": new Token("num", 0b10000000, -1, -1, -1),
				"SMSB": new Token("num", 0b01000000, -1, -1, -1),
				"MAX": new Token("num", 0b11111111, -1, -1, -1),
				"SMAX": new Token("num", 0b01111111, -1, -1, -1),
				"UHALF": new Token("num", 0b11110000, -1, -1, -1),
				"LHALF": new Token("num", 0b00001111, -1, -1, -1),
				"RUN": new Token("wrd", "ROM", -1, -1, -1)
			}
			let userdefinitions = {}

			let j = 0
			line

			let pendingLabels = []

			let BITS = 8

			const META = []

			while (j < lines.length) {
				line = lines[j]
				if (line.length == 0) {
					j += 1
					continue
				}
				if (line[0].type == "def") {
					switch (line[0].value.toUpperCase()) {
						case "DEFINE":
							if (line.length == 1) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected definition`})
							} else if (line.length == 2) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected definition value`})
							} else if (line.length == 3) {
								userdefinitions[line[1].key] = line[2]
							} else {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected definition name and value only`})
							}
							break
						case "ASSERT":
						case "ASSERT_N":
						case "ASSERT_EQ":
						case "ASSERT_NEQ":
							null
							break
						case "SCREEN_WIDTH": {
							if (line.length == 1) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected screen width`})
								break
							}
							if (line.length != 2) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected just screen width, ignoring extra parameters`})
							}
							let p = line[1]
							if (p.type != "num") {
								annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "error", text: `Expected screen width to be an integer`})
								break
							}
							META["SCREEN_WIDTH"] = p.value
							break }
						case "SCREEN_HEIGHT": {
							if (line.length == 1) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected screen height`})
								break
							}
							if (line.length != 2) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected just screen height, ignoring extra parameters`})
							}
							let p = line[1]
							if (p.type != "num") {
								annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "error", text: `Expected screen height to be an integer`})
								break
							}
							META["SCREEN_HEIGHT"] = p.value
							break }
						case "SCREEN_COLOR": {
							if (line.length == 1) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected screen color space`})
								break
							}
							if (line.length != 2) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected just screen color space, ignoring extra parameters`})
							}
							let p = line[1]
							if (p.type != "str") {
								annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "error", text: `Expected screen color space to be a string`})
								break
							}
							META["SCREEN_COLOR"] = p.value
							break }
						case "DRIVE":
							if (line.length == 1) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected drive name`})
								break
							}
							if (line.length != 2) {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Expected just drive name, ignoring extra parameters`})
							}
							let p = line[1]
							if (p.type != "str") {
								annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "error", text: `Expected drive name to be a string`})
								break
							}
							META["DRIVE"] = p.value
							break
					}
					j += 1
					continue
				}
				if (line[0].type == "wrd") {
					if (["BITS", "MINREG", "MINHEAP", "MINSTACK", "RUN"].includes(line[0].value.toUpperCase())) {
						if (line[0].value.toUpperCase() == "BITS") {
							let bits = 8
							if (line.length == 2) {
								if (line[1].type != "num") {
									annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "warning", text: `Expected integer in BITS definition got ${line[1].value}`})
								} else {
									bits = line[1].value
								}
							} else if (line.length == 3) {
								let e = 0
								if (line[1].type != "wrd" || !(["==", ">=", "<="].includes(line[1].value))) {
									annotations.push({column: line[1].column, row: line[1].row, type: "warning", text: `Expected ==, >= or <= in BITS definition got ${line[1].value} assumming ==`})
								} else if (line[1].type == "wrd" && line[1].value == "<=") {
									e = -1
								} else if (line[1].type == "wrd" && line[1].value == ">=") {
									e = +1
								}
								let n = 8
								if (line[2].type != "num") {
									annotations.push({column: line[2].column + 1, row: line[2].row + 1, type: "warning", text: `Expected integer in BITS definition got ${line[1].value}`})
								} else {
									n = line[2].value
								}
								if (e == 0) {
									bits = n
								} else if (e == -1) {
									if (n >= 8) {
										bits = 8
									} else {
										bits = n
									}
								} else {
									if (n <= 32) {
										bits = 32
									} else {
										annotations.push({column: line[2].column + 1, row: line[2].row + 1, type: "error", text: `BITS above 32 not supported, got ${n}`})
										unrecoverable = true
									}
								}
							} else {
								annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "warning", text: "Incorrect BITS definition, assumming 8 bit"})
							}
							definitions["BITS"] = new Token("num", bits, line[0].column, line[0].row, line[0].i)
							BITS = bits
						} else {
							if (line.length != 2) {
								annotations.push({column: line[0].column, row: line[0].row, type: "error", text: `Expected value after ${line[0].value} definition`})
								unrecoverable = true
							} else {
								definitions[line[0].value.toUpperCase()] = line[1]
							}
						}
						j += 1
						continue
					}
					j += 1
					continue
				}
				j += 1
				continue
			}



			definitions = {...definitions, ...{
				"HEAP":  new Token("num", mp2(definitions["MINHEAP"].value + definitions["MINSTACK"].value), definitions["MINHEAP"].column, definitions["MINHEAP"].row, definitions["MINHEAP"].i),
				"MSB":   new Token("num", 2 ** (definitions["BITS"].value - 1), definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				"SMSB":  new Token("num", 2 ** (definitions["BITS"].value - 2), definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				"MAX":   new Token("num", (2 ** (definitions["BITS"].value)) - 1, definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				"SMAX":  new Token("num", (2 ** (definitions["BITS"].value - 1)) - 1, definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				"UHALF": new Token("num", ((2 ** (Math.floor(definitions["BITS"].value / 2))) - 1) << Math.ceil(definitions["BITS"].value / 2), definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				"LHALF": new Token("num", (2 ** (Math.ceil(definitions["BITS"].value / 2))) - 1, definitions["BITS"].column, definitions["BITS"].row, definitions["BITS"].i),
				A:       new Token("num", 1 <<  0, -1, -1, -1),
				B:       new Token("num", 1 <<  1, -1, -1, -1),
				SELECT:  new Token("num", 1 <<  2, -1, -1, -1),
				START:   new Token("num", 1 <<  3, -1, -1, -1),
				LEFT:    new Token("num", 1 <<  4, -1, -1, -1),
				RIGHT:   new Token("num", 1 <<  5, -1, -1, -1),
				UP:      new Token("num", 1 <<  6, -1, -1, -1),
				DOWN:    new Token("num", 1 <<  7, -1, -1, -1),
				Y:       new Token("num", 1 <<  8, -1, -1, -1),
				X:       new Token("num", 1 <<  9, -1, -1, -1),
				LB:      new Token("num", 1 << 10, -1, -1, -1),
				RB:      new Token("num", 1 << 11, -1, -1, -1),
				LEFT2:   new Token("num", 1 << 12, -1, -1, -1),
				RIGHT2:  new Token("num", 1 << 13, -1, -1, -1),
				UP2:     new Token("num", 1 << 14, -1, -1, -1),
				DOWN2:   new Token("num", 1 << 15, -1, -1, -1),
				LT:      new Token("num", 1 << 16, -1, -1, -1),
				RT:      new Token("num", 1 << 17, -1, -1, -1),
				LStick:  new Token("num", 1 << 18, -1, -1, -1),
				RStick:  new Token("num", 1 << 19, -1, -1, -1),
				LEFT_X:  new Token("num", 1 <<  0, -1, -1, -1),
				LEFT_Y:  new Token("num", 1 <<  1, -1, -1, -1),
				RIGHT_X: new Token("num", 1 <<  2, -1, -1, -1),
				RIGHT_Y: new Token("num", 1 <<  3, -1, -1, -1),
			}}

			const DWSTART = definitions.HEAP.value

			const DEFINITIONS_ = {}

			for (const key of Object.keys(definitions)) {
				const value = definitions[key]
				DEFINITIONS_[`def ${key}`] = value
			}

			const DEFINITIONS = {...DEFINITIONS_, ...userdefinitions}
			DEFINITIONS["wrd pc"] = new Token("reg", -1, -1, -1, -1)
			DEFINITIONS["wrd sp"] = new Token("reg", -2, -1, -1, -1)
			DEFINITIONS["wrd PC"] = new Token("reg", -1, -1, -1, -1)
			DEFINITIONS["wrd SP"] = new Token("reg", -2, -1, -1, -1)


			function resolveDefinition(token) {
				while (token.key in DEFINITIONS) {
					token = DEFINITIONS[token.key]
				}
				return token
			}


			j = 0
			while (j < lines.length) {
				line = lines[j]
				if (line.length == 0) {
					j += 1
					continue
				}
				if (line[0].type == "lbl") {
					if (line.length > 1) {
						annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "warning", text: "Ignoring tokens after label definition"})
					}
					if (line[0].value in labels) {
						annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "error", text: `Label redefinition of ${line[0].value}`})
					}
					pendingLabels.push(line[0])
					j += 1
					continue
				}
				if (line[0].type == "def") {
					switch (line[0].value.toUpperCase()) {
						case "DEFINE":
							null
							break
						case "ASSERT":
						case "ASSERT_N":
						case "ASSERT_EQ":
						case "ASSERT_NEQ":
							for (let p of pendingLabels) {
								labels[p.value] = instructions.length
							}
							pendingLabels = []
							const ops = []
							for (let o of line.slice(1)) {
								o = resolveDefinition(o)
								if (o.type == "rel") {
									o = new Token("num", o.value + instructions.length, o.column, o.row, o.i)
								}
								ops.push(o)
							}
							instructions.push([line[0], ops])
							break
					}
					j += 1
					continue
				}
				if (line[0].type == "wrd") {
					if (["BITS", "MINREG", "MINHEAP", "MINSTACK", "RUN"].includes(line[0].value.toUpperCase())) {
						null
					}
					else if (line[0].value.toLowerCase() == "dw") {
						for (let p of pendingLabels) {
							labels[p.value] = data.length
						}
						pendingLabels = []
						for (let arg of line.slice(1)) {
							arg = resolveDefinition(arg)
							if (arg.type == "arr") {
								for (let argn of arg.value) {
									argn = resolveDefinition(argn)
									if (argn.type == "arr") {
										annotations.push({column: argn.column + 1, row: argn.row + 1, type: "error", text: `Nested arrays in DW not allowed ${argn.value}`})
										unrecoverable = true
									} else if (argn.type == "str" ) {
										const utf8 = new TextEncoder().encode(argn.value)
										for (let b of utf8) {
											data.push(new Token("chr", b, argn.column, argn.row, argn.i))
										}
									} else {
										data.push(argn)
									}
								}
							} else if (arg.type == "str" ) {
								const utf8 = new TextEncoder().encode(arg.value)
								for (let b of utf8) {
									data.push(new Token("chr", b, arg.column, arg.row, arg.i))
								}
							} else {
								data.push(arg)
							}
						}
					} else if (line[0].value.toLowerCase().startsWith("in") && line[0].value.toLowerCase().includes("%")) {
						const pi = line[0].value.indexOf("%")
						const opcode = line[0].value.slice(0, i)
						const port = resolveDefinition(new Token("prt", line[0].value.slice(i), line[0].column + len(pi), line[0].row, line[0].i + len(pi)))

						for (let p of pendingLabels) {
							labels[p.value] = instructions.length
						}
						pendingLabels = []
						const ops = []
						for (let o of line.slice(1)) {
							o = resolveDefinition(o)
							if (o.type == "rel") {
								o = new Token("num", o.value + instructions.length, o.column, o.row, o.i)
							}
							ops.push(o)
						}

						ops.push(port)

						instructions.push([new Token("wrd", opcode, line[0].column, line[0].row, line[0].i), ops])
					} else {
						for (let p of pendingLabels) {
							labels[p.value] = instructions.length
						}
						pendingLabels = []
						const ops = []
						for (let o of line.slice(1)) {
							o = resolveDefinition(o)
							if (o.type == "rel") {
								o = new Token("num", o.value + instructions.length, o.column, o.row, o.i)
							}
							ops.push(o)
						}
						instructions.push([line[0], ops])
					}
					j += 1
					continue
				}

				annotations.push({column: line[0].column, row: line[0].row, type: "error", text: `Unexpected first token in line ${line[0]}`})
				unrecoverable = true
				j += 1
			}

			console.log(data)

			for (let p of pendingLabels) {
				annotations.push({column: p.column + 1, row: p.row + 1, type: "warning", text: "Label at EOF treated as instruction label"})
				labels[p.value] = instructions.length
			}
			
			if (unrecoverable) {
				console.error(annotations)
				this.editor.getSession().setAnnotations(annotations)
				return
			}

			let MASK = (2 ** BITS) - 1

			const LIM = [8, 16, 32].includes(BITS) ? "" : `& ${MASK}`

			function arg(argm) {
				switch (argm.type) {
				case "num":
					return `(${argm.value} ${LIM})`
					break
				case "reg":
					if (argm.value == 0) {
						return `0`
					}else if (argm.value >= 0) {
						return `(this.registers[${argm.value + 1}] ${LIM})`;
					} else if (argm.value == -1) {
						return `(this.pc)`;
					} else if(argm.value == -2) {
						return `(this.sp)`;
					}
					break
				case "mem":
					return `(${argm.value + data.length} ${LIM})`
					break
				case "prt":
					return `(${PORTS[argm.value.toUpperCase()]} /* ${argm.value} */ ${LIM})`
				case "lbl": {
					if (!(argm.value in labels)) {
						annotations.push({row: argm.row, column: argm.column, text: `Unknown label ${arg.value}`, type: `error`})
					}
					return `(${labels[argm.value]} ${LIM})`;
					}
				case "str":
					return argm.value.codePointAt(0)
				}
				return `null`
			}

			function assign(dest, value) {
				if (dest === undefined) {
					annotations.push({row: line, column: 0, text: `Undefined assignment`, type: `error`})
					return `null;`
				}
				switch (dest.type) {
				case "imm":
				case "port":
					annotations.push({row: line, column: 0, text: `Cannot assign to an immediate`, type: `error`})
					break
				case "reg":
					/*if (dest.value == 0) {
						return `${value};`
					} else */if (dest.value >= 0) {
						// if (BITS == 8 || BITS == 16 || BITS == 32) {
						// 	return `this.registers[${dest.value}] = ${s};`
						// } else {
						// 	return `this.registers[${dest.value}] = (${s}) & ${MASK};`
						// }
						return `this.registers[${dest.value + 1}] = (${value}) ${LIM};`
					} else if (dest.value == -1) {
						return `this.pc = (${value}) ${LIM};`
					} else if(dest.value == -2) {
						return `this.sp = (${value}) ${LIM};`
					}
					break
				case "mem":
					annotations.push({row: dest.row, column: dest.column, text: `Cannot assign to a memory address directly`, type: `error`})
					break
				}
				return `null;`
			}

			const MEMSIZE = mp2(DEFINITIONS["def MINHEAP"].value + data.length + DEFINITIONS["def MINSTACK"].value)
			const MEMMASK = MEMSIZE - 1


	        const max_duration = "max_duration";
	        const callback_return_value = "cbvalue"
	        const burst_length = 5000;

	        let step = "let i = 1; switch(this.pc) {\n";
	        let run = `let i = 0;
	const end = performance.now() + ${max_duration};
	while (performance.now() < end) for (let j = 0; j < ${burst_length}; j++) switch(this.pc) {\n`;
	        for (let i = 0; i < instructions.length; i++) {
	            const opcode = instructions[i][0]
	            const args = instructions[i][1]

	            let instr = `\tthis.pc   = ${i + 1};`

switch (opcode.value.toUpperCase()) {
case "ADD":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} + ${arg(args[2])}`)
	}
	break;
case "RSH":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} >>> 1`)
	}
	break;
case "LOD":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `this.getMemory((${arg(args[1])}) & ${MEMMASK})`)
	}
	break;
case "STR":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.setMemory((${arg(args[0])}) & ${MEMMASK}, ${arg(args[1])})`
	}
	break;
case "BGE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} >= ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "NOR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `~(${arg(args[1])} | ${arg(args[2])})`)
	}
	break;
case "SUB":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} - ${arg(args[2])}`)
	}
	break;
case "JMP": // BRANCH
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pc = ${arg(args[0])}; break; `
	}
	break;
case "MOV":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], arg(args[1]))
	}
	break;
case "NOP":
	if (args.length != 0) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 0 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += ""
	}
	break;
case "IMM":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], arg(args[1]))
	}
	break;
case "LSH":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} << 1`)
	}
	break;
case "INC":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} + 1`)
	}
	break;
case "DEC":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} - 1`)
	}
	break;
case "NEG":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-${arg(args[1])}`)
	}
	break;
case "AND":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} & ${arg(args[2])}`)
	}
	break;
case "OR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} | ${arg(args[2])}`)
	}
	break;
case "NOT":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `~${arg(args[1])}`)
	}
	break;
case "XNOR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `~(${arg(args[1])} ^ ${arg(args[2])})`)
	}
	break;
case "XOR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} ^ ${arg(args[2])}`)
	}
	break;
case "NAND":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `~(${arg(args[1])} & ${arg(args[2])})`)
	}
	break;
case "BRL": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} < ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BRG": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} > ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BRE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} == ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BNE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} != ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BOD": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} % 2 == 1) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BEV": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} % 2 == 0) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BLE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} <= ${arg(args[2])}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BRZ": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])}  == 0) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BNZ": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} != 0) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BRN": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) < 0) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BRP": // BRANCH
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) >= 0) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "PSH":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pushMemory(${arg(args[0])})`
	}
	break;
case "POP":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `this.popMemory()`)
	}
	break;
case "CAL": // BRANCH
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pushMemory(this.pc); this.pc = ${arg(args[0])}; break;`
	}
	break;
case "RET": // BRANCH
	if (args.length != 0) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 0 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pc = this.popMemory(); break;`
	}
	break;
case "HLT":
	if (args.length != 0) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 0 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += "return [1, i, null]"
	}
	break;
case "CPY":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.setMemory((${arg(args[0])}) & ${MEMMASK}, this.getMemory((${arg(args[1])}) & ${MEMMASK}))`
	}
	break;
case "BRC": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} + ${arg(args[2])} > ${MASK}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "BNC": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (${arg(args[1])} + ${arg(args[2])} <= ${MASK}) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "MLT":
case "MUL":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `Math.imul((${arg(args[1])}), (${arg(args[2])}))`)
	}
	break;
case "DIV":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[2])} === 0 ? -1 : ((${arg(args[1])} >>> 0) / (${arg(args[2])} >>> 0) | 0)`)
	}
	break;
case "MOD":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		// instr += assign(args[0], `${arg(args[1])} % ${arg(args[2])}`)
		instr += assign(args[0], `${arg(args[2])} === 0 ? -1 : (${arg(args[1])} % ${arg(args[2])})`)
	}
	break;
case "BSR": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} >>> ${arg(args[2])}`)
	}
	break;
case "BSL": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} << ${arg(args[2])}`)
	}
	break;
case "SRS":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} >> 1`)
	}
	break;
case "BSS":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[1])} >> ${arg(args[2])}`)
	}
	break;
case "SETE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} == ${arg(args[2])})`)
	}
	break;
case "SETNE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} != ${arg(args[2])})`)
	}
	break;
case "SETG":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} > ${arg(args[2])})`)
	}
	break;
case "SETL":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} < ${arg(args[2])})`)
	}
	break;
case "SETGE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} >= ${arg(args[2])})`)
	}
	break;
case "SETLE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} <= ${arg(args[2])})`)
	}
	break;
case "SETC": // TODO
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} + ${arg(args[2])} > ${MASK})`)
	}
	break;
case "SETNC": // TODO
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(${arg(args[1])} + ${arg(args[2])} <= ${MASK})`)
	}
	break;
case "LLOD":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `this.getMemory((${arg(args[1])} + ${arg(args[2])}) & ${MEMMASK})`)
	}
	break;
case "LSTR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.setMemory((${arg(args[0])} + ${arg(args[1])}) & ${MEMMASK}, ${arg(args[2])})`
	}
	break;
case "SDIV":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `${arg(args[2])} === 0 ? -1 : ((this.toSigned(${arg(args[1])}) / this.toSigned(${arg(args[2])})) | 0)`)
	}
	break;
case "SBRL": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) < this.toSigned(${arg(args[2])})) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "SBRG": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) > this.toSigned(${arg(args[2])})) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "SBLE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) <= this.toSigned(${arg(args[2])})) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "SBGE": // BRANCH
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if (this.toSigned(${arg(args[1])}) >= this.toSigned(${arg(args[2])})) { this.pc = ${arg(args[0])}; break; }`
	}
	break;
case "SSETL":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(this.toSigned(${arg(args[1])}) < this.toSigned(${arg(args[2])}))`)
	}
	break;
case "SSETG":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(this.toSigned(${arg(args[1])}) > this.toSigned(${arg(args[2])}))`)
	}
	break;
case "SSETLE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(this.toSigned(${arg(args[1])}) <= this.toSigned(${arg(args[2])}))`)
	}
	break;
case "SSETGE":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `-(this.toSigned(${arg(args[1])}) >= this.toSigned(${arg(args[2])}))`)
	}
	break;
case "ABS":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `Math.abs(this.toSigned(${arg(args[1])}))`)
	}
	break;
case "IN": // IO
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `
			this.pc--;
			if (cbvalue !== undefined) {
				${assign(args[0], `cbvalue`)};
				this.pc   ++;
				cbvalue = undefined
			} else {
				let v = this.readPort(${arg(args[1])})
				if (typeof v == 'function') {
					return [2, i, v]
				} else {
					${assign(args[0], `v`)}
					this.pc   ++
				}
			}
		`
	}
	break;
case "OUT": // IO
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.writePort(${arg(args[0])}, ${arg(args[1])})`
	}
	break;
case "ASSERT":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if(!${arg(args[0])}) { console.log("failed assert ${opcode.row + 1}") } else { console.log("assert succeeded ${opcode.row + 1}") };`
	}
	break;
case "ASSERT_N":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if(${arg(args[0])}) { console.log("failed assert ${opcode.row + 1}") } else { console.log("assert succeeded ${opcode.row + 1}") };`
	}
	break;
case "ASSERT_EQ":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if(${arg(args[0])} != ${arg(args[1])}) { console.log("failed assert ${opcode.row + 1}") } else { console.log("assert succeeded ${opcode.row + 1}") };`
	}
	break;
case "ASSERT_NEQ":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `if(${arg(args[0])} == ${arg(args[1])}) { console.log("failed assert ${opcode.row + 1}") } else { console.log("assert succeeded ${opcode.row + 1}") };`
	}
	break;
case "UMLT":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `Number((BigInt(${arg(args[1])}) * BigInt(${arg(args[2])})) >>> ${BITS}n)`)
	}
	break;
case "SUMLT":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += assign(args[0], `Number((BigInt(this.toSigned(${arg(args[1])})) * BigInt(this.toSigned(${arg(args[2])}))) >> ${BITS}n)`)
	}
	break;
default:
	annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Unknown instruction ${opcode.value}`})
	unrecoverable = true
	break;
}
				
				instr = "{\n\t" + instr + "\n}"

				const l = `${opcode.value} ${args.map(a => `${a.type}:${a.value}`).join(" ")}`.replace(/\n/g, "\\n")

	            step += `case ${i}: // ${l} @ ${opcode.row + 1}\n`;
	            run += `case ${i}: // ${l} @ ${opcode.row + 1}\n`;
	            run += `i++;\n`
                step += `${instr}; return [${0}, 0, null];\n`;
                run += `${instr};\n;`
                if (instr.includes(".pc =") && !instr.includes("break")) {
                	run += "break;"
                }
	        }


	        step += `}\nreturn [${0}, 1, null];\n`;
	        run += `default: return [${1}, i, null]`;
	        run += `}\nreturn [${0}, i, null]`;

			this.editor.getSession().setAnnotations(annotations)

	        if (unrecoverable) {
	        	console.log(annotations)
	        	return
	        }

	        console.log(labels)

	        const DATA = []

	        for (let d of data) {
	        	switch (d.type) {
	        	case "num":
	        		DATA.push(d.value)
	        		break
	        	case "chr":
	        		DATA.push(d.value)
	        		break
	        	case "str":
	        		for (const char of d.value) {
	        			DATA.push(char.codePointAt(0))
	        		}
	        		break
	        	case "lbl":
	        		DATA.push(labels[d.value] ?? -1)
	        		break
	        	case "def":
	        		DATA.push(DEFINITIONS[d.key] ?? -1)
	        		break
	        	case "prt":
	        		DATA.push(PORTS[d.value] ?? -1)
	        		break
	        	default:
	        		break
	        	}
	        }


	        const INSTRUCTIONLINES = {}
	        for (let i = 0; i < instructions.length; i++) {
	        	INSTRUCTIONLINES[i] = instructions[i][0].row
	        }


	        if ("SCREEN_WIDTH" in META) {
	        	document.querySelector("input#screenwidth").value = META["SCREEN_WIDTH"]
	        	document.querySelector("input#screenwidth").dispatchEvent(new Event('change', { bubbles: true }))
	        }
	        if ("SCREEN_HEIGHT" in META) {
	        	document.querySelector("input#screenheight").value = META["SCREEN_HEIGHT"]
	        	document.querySelector("input#screenheight").dispatchEvent(new Event('change', { bubbles: true }))
	        }
	        if ("SCREEN_COLOR" in META) {
	        	document.querySelector("select#screencolormode").value = META["SCREEN_COLOR"]
	        	document.querySelector("select#screencolormode").dispatchEvent(new Event('change', { bubbles: true }))
	        }

	        const DRIVE = await DriveManager.getDriveHandle(META["DRIVE"])

	        return await (new URCLMachine(DATA, max_duration, callback_return_value, step, run, INSTRUCTIONLINES, DWSTART, this.editor, {
	        	"BITS": DEFINITIONS["def BITS"].value,
				"MINREG": DEFINITIONS["def MINREG"].value,
				"MINHEAP": DEFINITIONS["def MINHEAP"].value,
				"MINSTACK": DEFINITIONS["def MINSTACK"].value,
				"HEAP": DEFINITIONS["def HEAP"].value,
				"MSB": DEFINITIONS["def MSB"].value,
				"SMSB": DEFINITIONS["def SMSB"].value,
				"MAX": DEFINITIONS["def MAX"].value,
				"SMAX": DEFINITIONS["def SMAX"].value,
				"UHALF": DEFINITIONS["def UHALF"].value,
				"LHALF": DEFINITIONS["def LHALF"].value,
				"RUN": DEFINITIONS["def RUN"].value,
	        })).initDrive(DRIVE)
		}
	}

	window.registerExtension("urcl", URCLEditor)
}()


describeFormat("URCL", `<a href="https://github.com/ModPunchtree/URCL">Universal Reduced Computing Language</a> is a simple universal intermediate language`)
