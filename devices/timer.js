window["TimerDevice"] = window.Devices["TimerDevice"] = function(){
	const self = {
		wait(time) {
			setTimeout(() => {
				RuntimeManager.sendInput(1)
			}, time)
		},
	}
	return self
}()