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
	                	regex: "SP|PC|sp|pc(.(\d+)|[WwBbAa])?"
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
			}

			function escapeString(str) {
				return str.replace(
					/\\[0-9]|\\['"\bfnrtv]|\\column[0-9a-f]{2}|\\u[0-9a-f]{4}|\\u\{[0-9a-f]+\}|\\./ig,
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
							case "column": return String.fromCharCode(parseInt(match.substring(2), 16))
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
						line.push(new Token("num", parseInt(numstr), scolumn, srow, si))
						continue
					}
					if (numstr.match(/^[+-]?0x[A-F0-9]+$/i)) {
						line.push(new Token("num", parseInt(numstr), scolumn, srow, si))
						continue
					}
					if (numstr.match(/^[+-]?0b[01]+$/i)) {
						line.push(new Token("num", parseInt(numstr), scolumn, srow, si))
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
							if (c == "\n") {
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
							while (i < L && "+-0123456789abcdefABCDEF_bx".includes(char1)) {
								numstr += char1
								i += 1
								column += 1
								char1 = raw[i]
							}
							numstr = numstr.replace(/_/g, "")
							if (numstr.match(/^[+-]?\d+$/)) {
								arr.push(new Token("num", parseInt(numstr), scolumn, srow, si))
								continue
							}
							if (numstr.match(/^[+-]?0x[A-F0-9]+$/i)) {
								arr.push(new Token("num", parseInt(numstr), scolumn, srow, si))
								continue
							}
							if (numstr.match(/^[+-]?0b[01]+$/i)) {
								arr.push(new Token("num", parseInt(numstr), scolumn, srow, si))
								continue
							}
							annotations.push({row: row + 1, column: column + 1, type: "error", text: `Unknown numeric literal type ${numstr}, default to ${defaultErrorNumber}`})
							arr.push(new Token("num", defaultErrorNumber, scolumn, srow, si))
							continue
						}
						if (`'"`.includes(char)) {
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

			console.log(lines)

			if (unrecoverable) {
				this.editor.getSession().setAnnotations(annotations)
				return
			}

			const instructions = []
			const data = []
			const labels = {}

			let j = 0
			line

			let pendingLabels = []

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
					if (line[0].value.toLowerCase() == "dw") {
						for (let p of pendingLabels) {
							labels[p.value] = data.length
						}
						pendingLabels = []
						for (let arg of line.slice(1)) {
							if (arg.type == "arr") {
								for (let argn of arg.value) {
									if (argn.type == "arr") {
										annotations.push({column: argn.column + 1, row: argn.row + 1, type: "error", text: `Nested arrays in DW not allowed ${argn.value}`})
										unrecoverable = true
									} else if (argn.type == "str" ) {
										const utf8 = new TextEncoder().encode(argn.value)
										for (let b of utf8) {
											data.push(new Token("chr", b, arg.column, arg.row, arg.i))
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
					} else {
						for (let p of pendingLabels) {
							labels[p.value] = instructions.length
						}
						pendingLabels = []
						instructions.push([line[0], line.slice(1)])
					}
					j += 1
					continue
				}

				annotations.push({column: line[0].column, row: line[0].row, type: "error", text: `Unexpected first token in line ${line[0]}`})
				unrecoverable = true
				j += 1
			}

			for (let p of pendingLabels) {
				annotations.push({column: p.column + 1, row: p.row + 1, type: "warning", text: "Label at EOF treated as instruction label"})
				labels[p.value] = instructions.length
			}

			console.log(instructions, data, labels)
			
			if (unrecoverable) {
				this.editor.getSession().setAnnotations(annotations)
				return
			}
		}
	}

	window.registerExtension("urcl", URCLEditor)
}()


