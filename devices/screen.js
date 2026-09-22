window.Devices["ScreenDevice"] = window["ScreenDevice"] = function () {
	let canvas = null
	let ctx = null

	let width = 0
	let height = 0

	let needsSwap = false

	let imagedata = null
	let rawimagedata = null

	let buffer = null
	let rawbuffer = null

	let writeCount = 0

	let clearColor = 0 //0x000000ff

	const colorSpaces = {
		"RGBA8888": function (color) {
			return [
				(color >>> 24) & 0xff,
				(color >>> 16) & 0xff,
				(color >>>  8) & 0xff,
				color & 0xff,
			]
		},
		"RGB565": function (color) {
			return [
				((color & 0b1111100000000000) >>> 11) << 3,
				((color & 0b0000011111100000) >>>  5) << 2,
				((color & 0b0000000000011111) >>>  0) << 3,
				0xff
			]
		},
		"Monochrome": function(color) {
			return [color, color, color, 0xff]
		},
		"Pico8": function (color) {
			if (color < 16) return [
			    [0, 0, 0, 255],
			    [29, 43, 83, 255],
			    [126, 37, 83, 255],
			    [0, 135, 81, 255],
			    [171, 82, 54, 255],
			    [95, 87, 79, 255],
			    [194, 195, 199, 255],
			    [255, 241, 232, 255],
			    [255, 0, 77, 255],
			    [255, 163, 0, 255],
			    [255, 236, 39, 255],
			    [0, 228, 54, 255],
			    [41, 173, 255, 255],
			    [131, 118, 156, 255],
			    [255, 119, 168, 255],
			    [255, 204, 170, 255],
			][color]
			if (color < 128) return [255, 0, 0, 255]
			if (color < 144) return [
			    [17, 29, 53, 255],
			    [66, 50, 77, 255],
			    [0, 94, 87, 255],
			    [116, 47, 41, 255],
			    [73, 60, 43, 255],
			    [102, 108, 100, 255],
			    [255, 216, 190, 255],
			    [255, 25, 46, 255],
			    [239, 125, 0, 255],
			    [248, 234, 34, 255],
			    [0, 199, 47, 255],
			    [0, 131, 199, 255],
			    [94, 76, 116, 255],
			    [255, 73, 133, 255],
			    [255, 154, 125, 255],
			    [255, 206, 192, 255]
			][color - 128]
			return [255, 0, 0, 255]
		},
	}

	let currentColorSpace = colorSpaces.RGB565

	const self = {
		init() {
			canvas = document.querySelector("canvas#screen")
			canvas.width = parseFloat(document.querySelector("input#screenwidth").value)
			canvas.height = parseFloat(document.querySelector("input#screenheight").value)
			document.querySelector("input#screenwidth").onchange = (e) => {
				canvas.width = parseFloat(document.querySelector("input#screenwidth").value)
				self.prepare()
			}
			document.querySelector("input#screenheight").onchange = (e) => {
				canvas.height = parseFloat(document.querySelector("input#screenheight").value)
				self.prepare()
			}
			document.querySelector("select#screencolormode").onchange = (e) => {
				colorprocessor = processors[document.querySelector("select#screencolormode").value]
				updateColorProcessor()
			}

			width = canvas.width
			height = canvas.height

			self.prepare()

			return self
		},

		prepare() {
			canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`
			width = canvas.width
			height = canvas.height
			ctx = canvas.getContext("2d")
			ctx.fillStyle = "black"
			ctx.fillRect(0, 0, width, height)
			imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height)
			rawimagedata = ctx.getImageData(0, 0, canvas.width, canvas.height)
			buffer = ctx.createImageData(canvas.width, canvas.height)
			rawbuffer = ctx.createImageData(canvas.width, canvas.height)
			writeCount = 0
		},

		setPixel(x, y, color) {
			const index = (y * canvas.width + x) * 4
			const [r, g, b, a] = currentColorSpace(color)

			imagedata.data[index]     = r
			imagedata.data[index + 1] = g
			imagedata.data[index + 2] = b
			imagedata.data[index + 3] = a 

			rawimagedata.data[index]     = (color >> 24) & 0xff
			rawimagedata.data[index + 1] = (color >> 16) & 0xff
			rawimagedata.data[index + 2] = (color >> 8 ) & 0xff
			rawimagedata.data[index + 3] = (color      ) & 0xff

			writeCount++
		},

		getWidth() {
			return width
		},

		getHeight() {
			return height
		},

		getPixel(x, y) {
		    return ((rawimagedata.data[(y * canvas.width + x) * 4] << 24) |
	        (rawimagedata.data[(y * canvas.width + x) * 4 + 1] << 16) | 
	        (rawimagedata.data[(y * canvas.width + x) * 4 + 2] << 8) |
	        rawimagedata.data[(y * canvas.width + x) * 4 + 3]) >>> 0
		},

		swap() {
			buffer.data.set(imagedata.data.slice())
			rawbuffer.data.set(rawimagedata.data.slice())
			needsSwap = true
		},

		flush() {
			if (needsSwap) {
				ctx.putImageData(buffer, 0, 0)
				needsSwap = false
			}
		},

		clearBuffer() {
			var c = (clearColor & 0xff) << 24 | (clearColor & 0xff00) << 8 | (clearColor & 0xff0000) >>> 8 | clearColor >>> 24
			var iter = new Uint32Array(rawimagedata.data.buffer)
			for (let i = 0; i < iter.length; i++) {
				iter[i] = c
			}
			var convc = currentColorSpace(clearColor)
			var c2 = (convc[3]) << 24 | (convc[2] << 16) | (convc[1] << 8) | convc[0]
			var iter2 = new Uint32Array(imagedata.data.buffer)
			for (let i = 0; i < iter2.length; i++) {
				iter2[i] = c2
			}
			buffer.data.set(imagedata.data.slice())
			rawbuffer.data.set(rawimagedata.data.slice())
		},

		clear() {
			ctx?.fillRect(0, 0, width, height)
			var c = (clearColor & 0xff) << 24 | (clearColor & 0xff00) << 8 | (clearColor & 0xff0000) >>> 8 | clearColor >>> 24
			var iter = new Uint32Array(rawimagedata.data.buffer)
			for (let i = 0; i < iter.length; i++) {
				iter[i] = c
			}
			var convc = currentColorSpace(clearColor)
			var c2 = (convc[3]) << 24 | (convc[2] << 16) | (convc[1] << 8) | convc[0]
			var iter2 = new Uint32Array(imagedata.data.buffer)
			for (let i = 0; i < iter2.length; i++) {
				iter2[i] = c2
			}
			buffer.data.set(imagedata.data.slice())
			rawbuffer.data.set(rawimagedata.data.slice())
			ctx.putImageData(buffer, 0, 0)

			// imagedata = ctx.getImageData(0, 0, canvas.width, canvas.height)
			// rawimagedata = ctx.getImageData(0, 0, canvas.width, canvas.height)
			// buffer = ctx.createImageData(canvas.width, canvas.height)
			// rawbuffer = ctx.createImageData(canvas.width, canvas.height)
			needsSwap = false
		},
	}

	return self
}().init()