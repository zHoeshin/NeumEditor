window["MouseDevice"] = window.Devices["MouseDevice"] = function() {
	let buttons = 0
	let x = 0
	let y = 0

	let canvas

	let lastx = 0
	let lasty = 0

	const self = {
		translate(mousex, mousey) {
			if (!canvas) return [0, 0];
	        const {x, y, width, height} = canvas.getBoundingClientRect();
	        return [
	            (mousex - x) * canvas.width / width,
	            (mousey - y) * canvas.height / height,
	        ];
	    },

		onmove(e) {
	        if (document.pointerLockElement === null){
	            [x, y] = self.translate(e.clientX, e.clientY);
	        } else {
	            const {width, height} = canvas.getBoundingClientRect();
	            x += e.movementX * canvas.width / width;
	            y += e.movementY * canvas.height / height;
	        }

	        if (e.clientX >= window.innerWidth) {

	        }
	    },

	    oncontext(e) {
	        if (!e.ctrlKey && e.target === canvas){
	            e.preventDefault()
	        }
	    },

	    onup(e){
	        buttons = e.buttons
	        if (e.target === canvas){
	            e.preventDefault()
	        }
	    },
	    ondown(e){
	        buttons = e.buttons
	        if (e.target === canvas){
	            e.preventDefault()
	        }
	    },

		init() {
			canvas = ScreenDevice.getCanvas()

	        addEventListener("mousemove", self.onmove);
	        addEventListener("mousedown", self.ondown);
	        addEventListener("mouseup", self.onup);
	        addEventListener("contextmenu", self.oncontext);

	        return self
		},

		getX() {
			return x
		},
		getY() {
			return y
		},
		getSpeedX() {
			const dx = x - lastx
			lastx = x
			return dx
		},
		getSpeedY() {
			const dy = y - lasty
			lasty = y
			return dy
		},

		getButtons() {
			return buttons - 1
		},
	}

	return self.init
}()()