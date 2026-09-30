window["KeyboardDevice"] = window.Devices["KeyboardDevice"] = function(){
	const usb = {
	    KeyA: 0x04,
	    KeyB: 0x05,
	    KeyC: 0x06,
	    KeyD: 0x07,
	    KeyE: 0x08,
	    KeyF: 0x09,
	    KeyG: 0x0A,
	    KeyH: 0x0B,
	    KeyI: 0x0C,
	    KeyJ: 0x0D,
	    KeyK: 0x0E,
	    KeyL: 0x0F,
	    KeyM: 0x10,
	    KeyN: 0x11,
	    KeyO: 0x12,
	    KeyP: 0x13,
	    KeyQ: 0x14,
	    KeyR: 0x15,
	    KeyS: 0x16,
	    KeyT: 0x17,
	    KeyU: 0x18,
	    KeyV: 0x19,
	    KeyW: 0x1A,
	    KeyX: 0x1B,
	    KeyY: 0x1C,
	    KeyZ: 0x1D,
	    Digit1: 0x1E,
	    Digit2: 0x1F,
	    Digit3: 0x20,
	    Digit4: 0x21,
	    Digit5: 0x22,
	    Digit6: 0x23,
	    Digit7: 0x24,
	    Digit8: 0x25,
	    Digit9: 0x26,
	    Digit0: 0x27,
	    Enter: 0x28,
	    Escape: 0x29,
	    Backspace: 0x2A,
	    Tab: 0x2B,
	    Space: 0x2C,
	    Minus: 0x2D,
	    Equal: 0x2E,
	    BracketLeft: 0x2F,
	    BracketRight: 0x30,
	    Backslash: 0x31,
	    Semicolon: 0x33,
	    Quote: 0x34,
	    Backquote: 0x35,
	    Comma: 0x36,
	    Period: 0x37,
	    Slash: 0x38,
	    CapsLock: 0x39,
	    F1: 0x3A,
	    F2: 0x3B,
	    F3: 0x3C,
	    F4: 0x3D,
	    F5: 0x3E,
	    F6: 0x3F,
	    F7: 0x40,
	    F8: 0x41,
	    F9: 0x42,
	    F10: 0x43,
	    F11: 0x44,
	    F12: 0x45,
	    PrintScreen: 0x46,
	    ScrollLock: 0x47,
	    Pause: 0x48,
	    Insert: 0x49,
	    Home: 0x4A,
	    PageUp: 0x4B,
	    Delete: 0x4C,
	    End: 0x4D,
	    PageDown: 0x4E,
	    ArrowRight: 0x4F,
	    ArrowLeft: 0x50,
	    ArrowDown: 0x51,
	    ArrowUp: 0x52,
	    NumLock: 0x53,
	    NumpadDivide: 0x54,
	    NumpadMultiply: 0x55,
	    NumpadSubtract: 0x56,
	    NumpadAdd: 0x57,
	    NumpadEnter: 0x58,
	    Numpad1: 0x59,
	    Numpad2: 0x5A,
	    Numpad3: 0x5B,
	    Numpad4: 0x5C,
	    Numpad5: 0x5D,
	    Numpad6: 0x5E,
	    Numpad7: 0x5F,
	    Numpad8: 0x60,
	    Numpad9: 0x61,
	    Numpad0: 0x62,
	    NumpadDecimal: 0x63,
	    IntlBackslash: 0x64,
	    ControlLeft: 0xE0,
	    ShiftLeft: 0xE1,
	    AltLeft: 0xE2,
	    OSLeft: 0xE3,
	    ControlRight: 0xE4,
	    ShiftRight: 0xE5,
	    AltRight: 0xE6,
	    OSRight: 0xE7
	}
    const bits = 8;
    const down = new Uint8Array(256);
    let offset = 0;
	
    let currentusb = 0
    let currentkeycode = 0
    let currentcodepoint = 0

    const special = {
    	"Enter": 10,
    	"Escape": 0x1b,
    	"Tab": 0x09,
    	"Backspace": "\b".codePointAt(0),
    	"ArrowUp": -38,
    	"ArrowDown": -40,
    	"ArrowLeft": -37,
    	"ArrowRight": -39,
    }

    const self = {
		getAtOffsetPacked(bits = 8) {
			return down.slice(offset, offset + bits).reduceRight((acc, v) => (acc << 1) + v, 0)
		},


		setOffset(o) {
			offset = o
		},


	    onkeydown(e) {
	    	// console.warn(e, usb[e.code])
	        const k = usb[e.code];
	        if (k !== undefined) {
	            down[k] = 1;
	            currentusb = k
	            currentkeycode = e.keyCode
	            currentcodepoint = e.key.length == 1 ? e.key.codePointAt(0) : (special[e.key] ?? 0)
	        }
	    },

	    onkeyup(e) {
	        const k = usb[e.code];
	        if (k !== undefined) {
	            down[k] = 0;
	            if (currentusb == k) {
		            currentusb = 0
		            currentkeycode = 0
		            currentcodepoint = 0
	            }
	        }
	    },

	    onkeydownpd(e) {
	    	// console.error(e)
	        const k = usb[e.code];
	        if (k !== undefined) {
	        	e.preventDefault()
	            down[k] = 1;
	            currentusb = k
	            currentkeycode = e.keyCode
	            currentcodepoint = e.key.length == 1 ? e.key.codePointAt(0) : (special[e.key] ?? 0)
	        }
	    },
	    onkeyuppd(e) {
	        const k = usb[e.code];
	        if (k !== undefined) {
	            down[k] = 0;
	            if (currentusb == k) {
		            currentusb = 0
		            currentkeycode = 0
		            currentcodepoint = 0
	            }
	        }
	    },

	    getPad() {
	    	return (
	    		down[usb.KeyK] |
	    		down[usb.KeyJ] << 1 |
	    		down[usb.KeyN] << 2 |
	    		down[usb.KeyV] << 3 |
	    		down[usb.KeyA] << 4 |
	    		down[usb.KeyD] << 5 |
	    		down[usb.KeyW] << 6 |
	    		down[usb.KeyS] << 7 |
	    		down[usb.KeyU] << 8 |
	    		down[usb.KeyI] << 9 |
	    		down[usb.ShiftLeft] << 10 |
	    		down[usb.KeyL] << 11 |
	    		down[usb.ArrowLeft] << 12 |
	    		down[usb.ArrowRight] << 13 |
	    		down[usb.ArrowUp] << 14 |
	    		down[usb.ArrowDown] << 15
	    	)
	    },
		        
		init() {
		    addEventListener("keydown", self.onkeydown);
		    addEventListener("keyup", self.onkeyup);
		    // ScreenDevice.getCanvas().addEventListener("keydown", self.onkeydownpd);
		    // ScreenDevice.getCanvas().addEventListener("keyup", self.onkeyuppd);
		    return self
		},

		getCurrentUSB() {
			return currentusb
		},
		setCurrentUSB(k = 0) {
			currentusb = k
		},
		
		getCurrentKeycode() {
			return currentkeycode
		},
		setCurrentKeycode(k = 0) {
			currentkeycode = k
		},
		
		getCurrentCodepoint() {
			return currentcodepoint
		},
		setCurrentCodepoint(k = 0) {
			currentcodepoint = k
		},

		getConstants() {
			return usb
		},
	}

    return self.init
}()()