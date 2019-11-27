export default () => ({
	// System settings
	volume: {
		bluetooth: 0,
		master: 0,
		media: 0,
		soundEffect: 0
	},
	// General/Global app settings (view management, general app state, etc)
	app: {
		volumeType: process.env.REACT_APP_VOLUME_TYPE,
		visible: {
			volumeControl: false
		}
	}
});
