class BatPUMachine {
	constructor(max_duration, callback_return_value, step, run, INSTRUCTIONLINES, editor, ) {
		this.pc = 0
		this.sp = 0
		this.zero = false
		this.carry = false
		this.registers = new Uint8Array(16).fill(0)
		this.memory = new Uint8Array(256)
		this.step =  Function(callback_return_value, step)
		this.burst =  Function(max_duration, callback_return_value, run)
		this.pc2line = INSTRUCTIONLINES
		this.editor = editor
		this.markedline = 0
		this.stack = new Uint16Array(16)

		this.x = 0
		this.y = 0

		this.characters = ""
		this.outCharacters = ""

		this.number = 0
		this.numberOn = false
		this.numberSigned = false
	}

	markCurrentLine(line) {
		this.editor.getSession().$decorations = []
		this.editor.getSession().addGutterDecoration(line, "current-executed-line-marker")
		this.markedline = line
	}

	getLine() {
		return this.pc2line[this.pc] ?? -1
	}

    setMemory(addr, value){
    	if (addr >= 240) {
    		switch (addr) {
    		case 240:
    			this.x = value
    			break
    		case 241:
    			this.y = value
    			break
    		case 242:
    			ScreenDevice.setPixel(this.x & 0b11111, (31 - this.y) & 0b11111, 0xffffffff)
    			break
    		case 243:
    			ScreenDevice.setPixel(this.x & 0b11111, (31 - this.y) & 0b11111, 0x000000ff)
    			break
    		case 245:
    			ScreenDevice.swap()
    			break
    		case 246:
    			ScreenDevice.clearBuffer()
    			break
    		case 247:
    			this.characters += String.fromCodePoint(value)
    			break
    		case 248:
    			this.outCharacters = this.characters
    			ConsoleDevice.printRaw(`\x1b[2J${this.outCharacters}${this.numberOn ? this.numberSigned ? (this.number >= 128 ? this.number - 256 : this.number) : this.number : ""}`)
    			break
    		case 249:
    			this.characters = ""
    			break
    		case 250:
    			this.number = value
    			this.numberOn = true
    			ConsoleDevice.printRaw(`\x1b[2J${this.outCharacters}${this.numberOn ? this.numberSigned ? (this.number >= 128 ? this.number - 256 : this.number) : this.number : ""}`)
    			break
    		case 251:
    			this.numberOn = false
    			ConsoleDevice.printRaw(`\x1b[2J${this.outCharacters}${this.numberOn ? this.numberSigned ? (this.number >= 128 ? this.number - 256 : this.number) : this.number : ""}`)
    			break
    		case 252:
    			this.numberSigned = true
    			break
    		case 253:
    			this.numberSigned = false
    			break
    		}
    		return 0
    	}
        // if (addr >= this.memorysize){
        //     console.error(`Heap overflow on store: ${addr} >= ${this.memorysize}`);
        //     return 0
        // }
        this.memory[addr & 0xff] = value;
    
        return 0
    }
    getMemory(addr){
        addr &= 0xff
		
    	if (addr >= 240) {
    		switch (addr) {
    		case 244:
    			return (ScreenDevice.getPixel(this.x & 0b11111, (31 - this.y) & 0b11111) == 0xffffffff) | 0
    			break
    		case 254:
    			return (Math.random() * 256) | 0
    			break
    		case 255:
    			return (
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.Enter) << 7 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.Backspace) << 6 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.KeyX) << 5 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.KeyZ) << 4 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.ArrowUp) << 3 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.ArrowRight) << 2 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.ArrowDown) << 1 |
		    		KeyboardDevice.isPressed(KeyboardDevice.usb.ArrowLeft)
    			)
    			break
    		}
    		return 0
    	}
        // if (addr >= this.memorysize){
        //     console.error(`Heap overflow on load: ${addr} >= ${this.memorysize}`);
        //     return 0
        // }
        // console.warn(this.memory[addr], "at", addr)
        return this.memory[addr];
    }

    pushStack(value) {
    	this.stack[this.sp & 0xf] = value & 0b11_1111_1111
    	this.sp++
    }

    popStack() {
    	this.sp--
    	return this.stack[this.sp & 0xf]
    }
}

const BatPU = function(){
	ace.define("ace/mode/batpu_highlight_rules", ["require", "exports", "ace/lib/oop", "ace/mode/text_highlight_rules"], function(require, exports) {
	    "use strict";

	    var oop = require("ace/lib/oop");
	    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

	    var BatPUHighlightRules = function() {
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
	                	regex: "\\bSP|PC|sp|pc(.(\d+)|[WwBbAa])?\\b"
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
	                    regex: "@[A-Za-z]+\\b(.(\d+)|[WwBbAa])?"
	                },
	                {
	                	token: "keyword.control",
	                	regex: "\\bBITS|MINREG|MINHEAP|MINSTACK|RUN(.(\d+)|[WwBbAa])?\\b",
	                	caseInsensitive: true
	                },
	                {
	                    token: "support.function",
	                    regex: "\\b[a-zA-Z_][a-zA-Z0-9_]*(.(\d+)|[WwBbAa])?\\b"
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

	    oop.inherits(BatPUHighlightRules, TextHighlightRules);
	    exports.BatPUHighlightRules = BatPUHighlightRules;
	});

	ace.define("ace/mode/batpu", ["require", "exports", "ace/lib/oop", "ace/mode/text", "ace/mode/batpu_highlight_rules"], function(require, exports) {
	    "use strict";

	    var oop = require("ace/lib/oop");
	    var TextMode = require("./text").Mode;
	    var BatPUHighlightRules = require("./batpu_highlight_rules").BatPUHighlightRules;

	    var Mode = function() {
	        this.HighlightRules = BatPUHighlightRules;
	        this.$behaviour = this.$defaultBehaviour;
	    };
	    
	    oop.inherits(Mode, TextMode);

	    (function() {
	        this.lineCommentStart = "//";
	        this.blockComment = { start: "/*", end: "*/" };
	        
	        this.$id = "ace/mode/batpu";
	    }).call(Mode.prototype);

	    exports.Mode = Mode;
	});

	

	class BatPUEditor {
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
	        this.editor.session.setMode("ace/mode/batpu");
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
				// if (c == "~") {
				// 	column += 1
				// 	i += 1
				// 	let numstr = ""
				// 	let char = raw[i]
				// 	while (i < L && "+-0123456789_".includes(char)) {
				// 		numstr += char
				// 		i += 1
				// 		column += 1
				// 		char = raw[i]
				// 	}
				// 	line.push(new Token("rel", parseInt(numstr.replace(/_/g, "")), scolumn, srow, si))
				// 	continue
				// }
				if ("+-0123456789_".includes(c)) {
					let numstr = ""
					let char = raw[i]
					while (i < L && "+-0123456789abcdefABCDEF_bxoO".includes(char)) {
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
					// line.push(new Token("str", escapeString(str), scolumn, srow, si))
					line.push(new Token("num", escapeString(str).codePointAt(0), scolumn, srow, si))
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
					line.push(new Token("lbl", str.toLowerCase(), scolumn, srow, si))
					lines.push(line)
					line = []
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
				if (c == "#") {
					let start = i
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && char != "\n") {
						column += 1
						i += 1
						char = raw[i]
					}
					continue
				}
				if (c == ";") {
					let start = i
					i += 1
					column += 1
					let char = raw[i]
					while (i < L && char != "\n") {
						column += 1
						i += 1
						char = raw[i]
					}
					continue
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
				line.push(new Token("wrd", str.toLowerCase(), scolumn, srow, si))
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
			}
			let userdefinitions = {
				"wrd pixel_x": new Token("num", 240, -1, -1, -1),
				"wrd pixel_y": new Token("num", 241, -1, -1, -1),
				"wrd draw_pixel": new Token("num", 242, -1, -1, -1),
				"wrd clear_pixel": new Token("num", 243, -1, -1, -1),
				"wrd load_pixel": new Token("num", 244, -1, -1, -1),
				"wrd buffer_screen": new Token("num", 245, -1, -1, -1),
				"wrd clear_screen_buffer": new Token("num", 246, -1, -1, -1),
				"wrd write_char": new Token("num", 247, -1, -1, -1),
				"wrd buffer_chars": new Token("num", 248, -1, -1, -1),
				"wrd clear_chars_buffer": new Token("num", 249, -1, -1, -1),
				"wrd show_number": new Token("num", 250, -1, -1, -1),
				"wrd clear_number": new Token("num", 251, -1, -1, -1),
				"wrd signed_mode": new Token("num", 252, -1, -1, -1),
				"wrd unsigned_mode": new Token("num", 253, -1, -1, -1),
				"wrd rng": new Token("num", 254, -1, -1, -1),
				"wrd controller_input": new Token("num", 255, -1, -1, -1),
			}

			let j = 0
			line

			let pendingLabels = []

			let BITS = 8

			while (j < lines.length) {
				line = lines[j]
				if (line.length == 0) {
					j += 1
					continue
				}
				if (line[0].type == "wrd") {
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
						// case "ASSERT":
						// case "ASSERT_N":
						// case "ASSERT_EQ":
						// case "ASSERT_NEQ":
						// 	null
						// 	break
					}
					j += 1
					continue
				}
				// if (line[0].type == "wrd") {
				// 	if (["BITS", "MINREG", "MINHEAP", "MINSTACK", "RUN"].includes(line[0].value.toUpperCase())) {
				// 		if (line[0].value.toUpperCase() == "BITS") {
				// 			let bits = 8
				// 			if (line.length == 2) {
				// 				if (line[1].type != "num") {
				// 					annotations.push({column: line[1].column + 1, row: line[1].row + 1, type: "warning", text: `Expected integer in BITS definition got ${line[1].value}`})
				// 				} else {
				// 					bits = line[1].value
				// 				}
				// 			} else if (line.length == 3) {
				// 				let e = 0
				// 				if (line[1].type != "wrd" || !(["==", ">=", "<="].includes(line[1].value))) {
				// 					annotations.push({column: line[1].column, row: line[1].row, type: "warning", text: `Expected ==, >= or <= in BITS definition got ${line[1].value} assumming ==`})
				// 				} else if (line[1].type == "wrd" && line[1].value == "<=") {
				// 					e = -1
				// 				} else if (line[1].type == "wrd" && line[1].value == ">=") {
				// 					e = +1
				// 				}
				// 				let n = 8
				// 				if (line[2].type != "num") {
				// 					annotations.push({column: line[2].column + 1, row: line[2].row + 1, type: "warning", text: `Expected integer in BITS definition got ${line[1].value}`})
				// 				} else {
				// 					n = line[2].value
				// 				}
				// 				if (e == 0) {
				// 					bits = n
				// 				} else if (e == -1) {
				// 					if (n >= 8) {
				// 						bits = 8
				// 					} else {
				// 						bits = n
				// 					}
				// 				} else {
				// 					if (n <= 32) {
				// 						bits = 32
				// 					} else {
				// 						annotations.push({column: line[2].column + 1, row: line[2].row + 1, type: "error", text: `BITS above 32 not supported, got ${n}`})
				// 						unrecoverable = true
				// 					}
				// 				}
				// 			} else {
				// 				annotations.push({column: line[0].column + 1, row: line[0].row + 1, type: "warning", text: "Incorrect BITS definition, assumming 8 bit"})
				// 			}
				// 			definitions["BITS"] = new Token("num", bits, line[0].column, line[0].row, line[0].i)
				// 			BITS = bits
				// 		} else {
				// 			if (line.length != 2) {
				// 				annotations.push({column: line[0].column, row: line[0].row, type: "error", text: `Expected value after ${line[0].value} definition`})
				// 				unrecoverable = true
				// 			} else {
				// 				definitions[line[0].value.toUpperCase()] = line[1]
				// 			}
				// 		}
				// 		j += 1
				// 		continue
				// 	}
				// 	j += 1
				// 	continue
				// }
				j += 1
				continue
			}

			let speed = 120;

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
				if (line[0].type == "wrd") {
					if (line[0].value.toUpperCase() == "DEFINE") {
						j += 1
						continue
					}
					if (line[0].value.toUpperCase() == "SPEED") {
                        if (line.length != 2) {
							annotations.push({column: line[0].column, row: line[0].row, type: "error", text: "Expected exactly 1 argument in speed declaration"})
							j += 1
							continue
						}
						let a = line[1]
						if (a.key in userdefinitions) {
							a = userdefinitions[a.key]
						}
						if (a.type != "num") {
							annotations.push({column: a.column, row: a.row, type: "error", text: "Expected a number in speed declaration"})
							j += 1
							continue
						}
						speed = a.value
						j += 1
						continue
					}
					for (let p of pendingLabels) {
						labels[p.value] = instructions.length
					}
					pendingLabels = []
					const ops = []
					for (let o of line.slice(1)) {
						if (o.key in userdefinitions) {
							o = userdefinitions[o.key]
						}
						if (o.type == "rel") {
							o = new Token("num", o.value + instructions.length, o.column, o.row, o.i)
						}
						ops.push(o)
					}
					instructions.push([line[0], ops])
					j += 1
					continue
				}

				annotations.push({column: line[0].column, row: line[0].row, type: "error", text: `Unexpected first token in line ${line[0]}`})
				unrecoverable = true
				j += 1
			}

			console.log(data)

			for (let p of pendingLabels) {
				// annotations.push({column: p.column + 1, row: p.row + 1, type: "warning", text: "Label at EOF treated as instruction label"})
				labels[p.value] = instructions.length
			}
			
			if (unrecoverable) {
				console.error(annotations)
				this.editor.getSession().setAnnotations(annotations)
				return
			}

			function arg(argm) {
				switch (argm.type) {
				case "num":
					return `(${argm.value})`
					break
				case "reg":
					if (argm.value == 0) {
						return `0`
					}else if (argm.value >= 0) {
						return `this.registers[${argm.value}]`;
					} else if (argm.value == -1) {
						return `(this.pc)`;
					} else if(argm.value == -2) {
						return `(this.sp)`;
					}
					break
				case "lbl": {
					if (!(argm.value in labels)) {
						annotations.push({row: argm.row, column: argm.column, text: `Unknown label ${arg.value}`, type: `error`})
					}
					return `(${labels[argm.value]})`;
					}
				case "str":
					return argm.value.codePointAt(0)
				}
				annotations.push({row: argm.row, column: argm.column, text: `Unknown value ${arg.value}`, type: `error`})
				return `null`
			}

			function assign(dest, value) {
				if (dest === undefined) {
					annotations.push({row: dest.row, column: dest.column, text: `Undefined assignment`, type: `error`})
					return `null;`
				}
				switch (dest.type) {
				case "reg":
					/*if (dest.value == 0) {
						return `${value};`
					} else */if (dest.value >= 0) {
						// if (BITS == 8 || BITS == 16 || BITS == 32) {
						// 	return `this.registers[${dest.value}] = ${s};`
						// } else {
						// 	return `this.registers[${dest.value}] = (${s}) & ${MASK};`
						// }
						return `this.registers[${dest.value}] = (${value});`
					}
					break
				}
				annotations.push({row: line, column: 0, text: `Invalid assignment`, type: `error`})
				return `null;`
			}
			

			function gr(n) {
				return n != 0 ? `this.registers[${n}]` : `0`
			}
			function sr(n) {
				return n != 0 ? `this.registers[${n}] = ` : ``
			}


	        const max_duration = "max_duration";
	        const callback_return_value = "cbvalue"
	        const burst_length = 500;

	        let step = "let i = 1; switch(this.pc) {\n";
	//         let run = `let i = 0;
	// const end = performance.now() + ${max_duration};
	// while (performance.now() < end) for (let j = 0; j < ${burst_length}; j++) switch(this.pc) {\n`;
	        let run = `let i = 0; for (let j = 0; j < ${speed / 60}; j++) switch(this.pc) {\n`;
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
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "reg") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 3 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		let d = args[2].value
		instr += `{let v = ${gr(a)} + ${gr(b)}; ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = v > 0xff; }`
	}
	break;
case "INC":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		instr += `{let v = ${gr(a)} + 1; ${sr(a)} v; this.zero = (v & 0xff) == 0; this.carry = v == 0; }`
	}
	break;
case "DEC":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		instr += `{let v = ${gr(a)} - 1; ${sr(a)} v; this.zero = (v & 0xff) == 0; this.carry = v == 0xff; }`
	}
	break;
case "SUB":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "reg") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 3 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		let d = args[2].value
		instr += `{let v = ${gr(a)} - ${gr(b)}; ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = v >= 0; }`
	}
	break;
case "NOR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "reg") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 3 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		let d = args[2].value
		instr += `{let v = ~(${gr(a)} | ${gr(b)}); ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = 0; }`
	}
	break;
case "NOT":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `{this.zero = (${sr(d)} ((~${gr(a)}) & 0xff)) == 0; this.carry = 0; }`
	}
	break;
case "NEG":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `{let v = -${gr(a)}; ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = v >= 0; }`
	}
	break;
case "AND":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "reg") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 3 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		let d = args[2].value
		instr += `{let v = (${gr(a)} & ${gr(b)}); ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = 0; }`
	}
	break;
case "XOR":
	if (args.length != 3) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "reg") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 3 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		let d = args[2].value
		instr += `{let v = (${gr(a)} ^ ${gr(b)}); ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = 0; }`
	}
	break;
case "RSH":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `{let v = ${gr(a)} >>> 1; ${sr(d)} v; }`
	}
	break;
case "LSH":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `{let v = ${gr(a)} << 1; ${sr(d)} v; this.zero = (v & 0xff) == 0; this.carry = v > 0xff; }`
	}
	break;
case "LDI":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "num") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be an immediate`})
			unrecoverable = true
			break
		}
		let d = args[0].value
		let o = args[1].value & 0xff
		instr += `{${sr(d)} ${o};}`
	}
	break;
case "ADI":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "num") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be an immediate`})
			unrecoverable = true
			break
		}
		let d = args[0].value
		let o = args[1].value & 0xff
		instr += `{let v = ${sr(d)} (${gr(d)} + ${o}); this.zero = (v & 0xff) == 0; this.carry = v > 0xff; }`
	}
	break;
case "NOP":
	break
case "HLT":
	if (args.length != 0) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 0 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += "return [1, i, null]"
	}
	break;
case "LOD":
	if (args.length == 2) {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `${sr(d)} this.getMemory(${gr(a)});`
	} else if (args.length == 3) {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "num") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 2 must be an immediate`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		let o = (((args[2].value >>> 0) << (32 - 4)) >> (32 - 4))
		instr += `${sr(d)} this.getMemory((${gr(a)} + ${o}) & 0xff);`
	} else {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 or 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	}
	break
case "STR":
	if (args.length == 2) {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `this.setMemory(${gr(a)}, ${gr(d)});`
	} else if (args.length == 3) {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		if (args[2].type != "num") {
			annotations.push({column: args[2].column, row: args[2].row, type: "error", text: `Operand 2 must be an immediate`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		let o = (((args[2].value >>> 0) << (32 - 4)) >> (32 - 4))
		instr += `this.setMemory((${gr(a)} + ${o}) & 0xff, ${gr(d)});`
	} else {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 or 3 operands for instruction ${opcode.value}`})
		unrecoverable = true
	}
	break
case "JMP":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pc = ${arg(args[0])}; break; `
	}
	break;
case "CAL":
	if (args.length != 1) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 1 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pushStack(this.pc); this.pc = ${arg(args[0])}; break; `
	}
	break;
case "RET":
	if (args.length != 0) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 0 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		instr += `this.pc = this.popStack(); break; `
	}
	break;
case "BRH":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "wrd" || !['eq', 'ne', 'ge', 'lt', '=', '!=', '>=', '<', 'z', 'nz', 'c', 'nc', 'zero', 'notzero', 'carry', 'notcarry'].includes(args[0].value.toLowerCase())) {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a comparison`})
			unrecoverable = true
			break
		}
		if (args[1].type == "lbl") {
			let name = args[1].value
			args[1].type = "num"
			args[1].value = labels[args[1].value]
			if (args[1].value === undefined) {
                annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Unknown label ${name}`})
				unrecoverable = true
				break
			}
		}
		if (args[1].type != "num") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be an immediate`})
			unrecoverable = true
		}
		let t = args[1].value & 0b1111111111
		switch (args[0].value.toLowerCase()) {
		case "eq": case "=": case "z": case "zero":
			instr += `if (this.zero) { this.pc = ${t}; break; }`
			break
		case "ne": case "!=": case "nz": case "notzero":
			instr += `if (!this.zero) { this.pc = ${t}; break; }`
			break
		case "ge": case ">=": case "c": case "carry":
			instr += `if (this.carry) { this.pc = ${t}; break; }`
			break
		case "lt": case "<": case "nc": case "notcarry":
			instr += `if (!this.carry) { this.pc = ${t}; break; }`
			break
		}
	}
	break;
case "CMP":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let b = args[1].value
		instr += `{let v = ${gr(a)} - ${gr(b)}; this.zero = (v & 0xff) == 0; this.carry = v >= 0; }`
	}
	break;
case "MOV":
	if (args.length != 2) {
		annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Expected 2 operands for instruction ${opcode.value}`})
		unrecoverable = true
	} else {
		if (args[0].type != "reg") {
			annotations.push({column: args[0].column, row: args[0].row, type: "error", text: `Operand 1 must be a register`})
			unrecoverable = true
			break
		}
		if (args[1].type != "reg") {
			annotations.push({column: args[1].column, row: args[1].row, type: "error", text: `Operand 2 must be a register`})
			unrecoverable = true
			break
		}
		let a = args[0].value
		let d = args[1].value
		instr += `{this.zero = (${sr(d)} ${gr(a)}) == 0; this.carry = 0; }`
	}
	break;
default:
	annotations.push({column: opcode.column, row: opcode.row, type: "error", text: `Unknown instruction ${opcode.value}`})
	unrecoverable = true
	break;
}
				
	            step += `case ${i}: // ${opcode.value}\n`;
	            run += `case ${i}: // ${opcode.value}\n`;
	            run += `i++;\n`
                step += `${instr}; return [${0}, 0, null];\n`;
                run += `${instr}; break;\n;`
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


	        const INSTRUCTIONLINES = {}
	        for (let i = 0; i < instructions.length; i++) {
	        	INSTRUCTIONLINES[i] = instructions[i][0].row
	        }

        	document.querySelector("input#screenwidth").value = 32
        	document.querySelector("input#screenwidth").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("input#screenheight").value = 32
        	document.querySelector("input#screenheight").dispatchEvent(new Event('change', { bubbles: true }))
        	document.querySelector("select#screencolormode").value = "RGBA8888"
        	document.querySelector("select#screencolormode").dispatchEvent(new Event('change', { bubbles: true }))


	        return new BatPUMachine(max_duration, callback_return_value, step, run, INSTRUCTIONLINES, this.editor, )
		}
	}

	window.registerExtension("batpu", BatPUEditor)
}()


describeFormat("BatPU-2", `<a href="https://github.com/mattbatwings/BatPU-2">BatPU-2</a> is an assembly language for an educational redstone computed created by <a href="https://www.youtube.com/mattbatwings">mattbatwings</a>`)
