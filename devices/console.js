window.Devices["ConsoleDevice"] = window["ConsoleDevice"] = function() {
	const bgCanvas = document.querySelector("canvas#consolebg")
	const fgCanvas = document.querySelector("canvas#consolefg")
	const textWrapper = document.querySelector("pre#consoletext")
	const bgtextWrapper = document.querySelector("pre#consoletextbg")
	const selectionCanvas = document.querySelector("canvas#consoleselection")

	const wrapper = document.querySelector("div#consolewrapper")

	let bgContext = bgCanvas.getContext("2d")
	let fgContext = fgCanvas.getContext("2d")
	let selectionContext = selectionCanvas.getContext("2d")

	let textBuffer
	let fgBuffer
	let bgBuffer
	let styleBuffer
	let selectionBuffer

	let fgImageData
	let bgImageData
	let selectionImageData

	let currentBg = 0xff000000
	let currentFg = 0xffffffff
	let currentStyle = ""

	let width = 80
	let height = 24

	let x = 0
	let y = 0

	let handlingAnsi = false
	let ansi = ""

	let needsSwap = true

	const self = {
		init() {
			bgCanvas.width = width
			bgCanvas.height = height
			fgCanvas.width = width
			fgCanvas.height = height
			selectionCanvas.width = width
			selectionCanvas.height = height

			wrapper.style.setProperty("--w", width)
			wrapper.style.setProperty("--h", height)

			textBuffer = new Array(width * height).fill("")
			styleBuffer = new Array(width * height).fill("")
			bgBuffer = new Uint32Array(width * height).fill(currentBg)
			fgBuffer = new Uint32Array(width * height).fill(currentFg)
			selectionBuffer = new Uint32Array(width * height).fill(0)

			fgImageData = new ImageData(new Uint8ClampedArray(fgBuffer.buffer), width, height)
			bgImageData = new ImageData(new Uint8ClampedArray(bgBuffer.buffer), width, height)
			selectionImageData = new ImageData(new Uint8ClampedArray(selectionBuffer.buffer), width, height)

			self.flush()

			return self
		},

		outRawChar(char) {
			if (char == "\n") {
				x = width - 1
				textBuffer[y * width + x] = "\n"
				styleBuffer[y * width + x] = currentStyle
				fgBuffer[y * width + x] = currentFg
				bgBuffer[y * width + x] = currentBg
				y += 1
				x = 0
			} else {
				textBuffer[y * width + x] = char
				styleBuffer[y * width + x] = currentStyle
				fgBuffer[y * width + x] = currentFg
				bgBuffer[y * width + x] = currentBg
				x += 1
				if (x >= width) {
					x -= 1
					textBuffer[y * width + x] = char + "\n"
					x = 0
					y += 1
				}
			}

			if (y >= height) {
				textBuffer = textBuffer.slice(width)
				textBuffer = textBuffer.concat(new Array(width).fill(""))
				styleBuffer = styleBuffer.slice(width)
				styleBuffer = styleBuffer.concat(new Array(width).fill(""))

				fgBuffer.copyWithin(0, width)
				bgBuffer.copyWithin(0, width)

				fgBuffer.fill(currentFg, (height - 1) * width, height * width)
				bgBuffer.fill(currentBg, (height - 1) * width, height * width)
				y -= 1
			}
		},


		moveCursor(dx, dy, relative = false) {
			if (!relative) {
				x = Math.max(0, Math.min(width - 1, dx))
				y = Math.max(0, Math.min(height - 1, dy))
			} else if (relative) {
				x = Math.max(0, Math.min(width - 1, x + dx))
				y = Math.max(0, Math.min(height - 1, y + dy))
			}
		},


		sameStyle(s1, s2) {
		    return s1.split('').sort().join('') === s2.split('').sort().join('');
		},
		styleAdd(s) {
			currentStyle = currentStyle.replace(s, "") + s
		},
		styleRemove(s) {
			currentStyle = currentStyle.replace(s, "")
		},

		outChar(char) {
			needsSwap = true

			if (handlingAnsi) {
				let n = char.codePointAt(0)
				if (n == 91 /* [ */ && ansi == "") {
					ansi += "["
				} else if (n >= 48 /* 0 */ && n <= 59 /* ; */ && n != 58 /* : */) {
					ansi += char
				} else if ((n >= 65 /* A */ && n <= 90 /* Z */) || (n >= 97 /* a */ && n <= 122 /* z */)) {
					ansi += char

					const codes = ansi.slice(1, -1).split(";").map(n => parseInt(n)).map(n => isNaN(n) ? undefined : n)
					const mode = ansi[ansi.length - 1]

					switch (mode) {
					case "J":
						//consoleoutput.innerText = ""
						{
							const c = codes[0] ?? 0
							if (c % 2 == 0) {
								for(let i = 0; i < y * width + x; i++) {
									textBuffer[i] = ""
								}
							}
							if (c % 2 > 0) {
								for(let i = y * width + x; i < width * height; i++) {
									textBuffer[i] = ""
								}
							}
							if (c == 2) {
								self.moveCursor(0, 0, false)
							}
						}
						break
					case "A": // up
						{
							const c = codes[0] ?? 1
							self.moveCursor(0, -c, true)
						}
						break
					case "B": // down
						{
							const c = codes[0] ?? 1
							self.moveCursor(0, c, true)
						}
						break
					case "C": // left
						{
							const c = codes[0] ?? 1
							self.moveCursor(c, 0, true)
						}
						break
					case "D": // right
						{
							const c = codes[0] ?? 1
							self.moveCursor(-c, 0, true)
						}
						break
					
					case "E": // next line
						{
							const c = codes[0] ?? 1
							self.moveCursor(0, y + c, false)
						}
						break
					case "F": // prev line
						{
							const c = codes[0] ?? 1
							self.moveCursor(0, y - c, false)
						}
						break

					case "H": // position cursor
						{
							const [nx, ny] = codes
							self.moveCursor(nx??0, ny??0, false)
						}
						break


					case "m":
						{
							for (let i = 0; i < codes.length; i ++) {
								const c = codes[i] ?? 0
								if (c == 0) {
									currentStyle = ""
									currentFg = 0xffffffff
									currentBg = 0xff000000
								}
								else if (c == 1)  { self.styleAdd("b") }                           // bold
								else if (c == 2)  { self.styleAdd("f") }                           // faint
								else if (c == 3)  { self.styleAdd("i") }                           // italic
								else if (c == 4)  { self.styleAdd("u"); self.styleRemove("d") }    // underlined
								else if (c == 5)  { self.styleAdd("s") }                           // slow blink
								else if (c == 6)  { self.styleAdd("r") }                           // rapid blink
								else if (c == 7)  { self.styleAdd("I") }                           // inverted
								else if (c == 8)  { self.styleAdd("h") }                           // conceal or hide
								else if (c == 9)  { self.styleAdd("x") }                           // crossed out
								else if (c == 21) { self.styleAdd("d"); self.styleRemove("u") }    // double underlined
								else if (c == 22) { self.styleRemove("b"); self.styleRemove("f") } // normal intensity
								else if (c == 25) { self.styleRemove("i") }                        // not italic or blackletter
								else if (c == 24) { self.styleRemove("u"); self.styleRemove("d") } // not underlined
								else if (c == 25) { self.styleRemove("s"); self.styleRemove("r") } // not blinking
								else if (c == 27) { self.styleRemove("I") }                        // not inverted
								else if (c == 28) { self.styleRemove("h") }                        // not hidden
								else if (c == 29) { self.styleRemove("x") }                        // not crossed out
								else if (c >= 30 && c <= 37) {                                     // foreground color
									currentFg = [
										0xff202020, 0xff0000c0, 0xff00c000, 0xff00c0c0, 0xffc00000, 0xffc000c0, 0xffc0c000, 0xffc0c0c0
									][c - 30]
								}
								// TODO: 38 - 5;n or 2;r;g;b color?
								// TODO: 39 - default color
								else if (c >= 40 && c <= 47) {                           // background color
									currentBg = [
										0xff404040, 0xff0000a0, 0xffff00a0, 0xff00a0a0, 0xffa00000, 0xffa000a0, 0xffa0a000, 0xffa0a0a0
									][c - 40]
								}
								// TODO: 48 - 5;n or 2;r;g;b color?
								// TODO: 49 - default bg color
								else {
									console.error(`Unknown ANSI code ${c}`)
								}
							}
						}
						break

					/*
					case "":
						{
							const c = codes[0] ?? 0
						}
						break
					*/
					default:
						self.outRawChar("\x1b")
						for (const c of ansi) {
							self.outRawChar(c)
						}
						break
					}

					handlingAnsi = false
					ansi = ""

				} else {
					handlingAnsi = false
					ansi = ""
				}
			} else {
				if (char == "\x1b") {
					handlingAnsi = true
				} else {
					self.outRawChar(char)
				}
			}
		},

		print(...args) {
			let kvargs = args.length > 0 && typeof args[args.length - 1] == "object" && args[args.length - 1] != null && !Array.isArray(args[args.length - 1]) ? args.pop() : {}
			for(const char of args.join(kvargs["sep"] ?? " ") + (kvargs["end"] ?? "\n")) {
				self.outChar(char)
			}
			self.flush()
		},

		flush() {
			if (!needsSwap) {
				return
			}

			bgContext.putImageData(bgImageData, 0, 0)
			fgContext.putImageData(fgImageData, 0, 0)
			selectionContext.putImageData(selectionImageData, 0, 0)

			let spans = []
			let cstyle = ""
			let spanstr = ""
			for(let i = 0; i < width * height; i ++) {
				while ((i < width * height) && self.sameStyle(styleBuffer[i], cstyle)) {
					spanstr += textBuffer[i] ?? "�"
					i += 1
				}
				//s += `<span style="color: ${getColor(ccolor)}" class="${cstyle.split('').join(' ')}">${spanstr}</span>`
				const span = document.createElement("span")
				span.className = `${cstyle.split('').join(' ')}`
				//span.style.color = getColor(ccolor)
				//span.style.backgroundColor = getColor(cbgcolor)
				// span.style.setProperty("--c", getColor(cstyle.includes("I") ? cbgcolor : ccolor))



				//span.style.setProperty("--b", getColor(cbgcolor))
				span.style.whiteSpace = "pre"
				span.innerText = spanstr
				//console.log(spanstr)
				spans.push(span)

				cstyle = styleBuffer[i] || ""
				// ccolor = buffercolor[i]
				// cbgcolor = bufferbgcolor[i]
				spanstr = ""

				i--
			}

			// textWrapper.textContent = textBuffer.join("")
			textWrapper.replaceChildren(...spans)
			textWrapper.style.backgroundImage = `url(${fgCanvas.toDataURL("image/png")})`
			// bgtextWrapper.textContent = textBuffer.join("")
		},
	}

	return self.init
}()()