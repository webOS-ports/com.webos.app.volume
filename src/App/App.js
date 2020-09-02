import AgateDecorator from '@enact/agate/AgateDecorator';
import Button from '@enact/agate/Button';
import ConsumerDecorator from '@enact/agate/data/ConsumerDecorator';
import ProviderDecorator from '@enact/agate/data/ProviderDecorator';
import Transition from '@enact/ui/Transition';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import compose from 'ramda/src/compose';
import React from 'react';
import {
	__MOCK__,
	Audio,
	cancelAllRequests,
	requests,
	cancelRequest
} from 'webos-auto-service';
import {getDisplayAffinity} from 'webos-auto-service/utils/displayAffinity';

import VolumeControls from '../views/VolumeControls';

import initialState from './initialState';

import css from './App.module.less';

const
	delayTohide = 5000;

let hideTimerId = null;

const
	clearHideTime = () => {
		if (hideTimerId) {
			clearTimeout(hideTimerId);
		}
	},
	setHideTime = (update) => {
		clearHideTime();
		hideTimerId = setTimeout(() => {
			update(state => {
				state.app.visible.type = 'fade';
				state.app.visible.volumeControl = false;
			});
		}, delayTohide);
	};

const getMasterVolume = (update) => {
	const currentDisplayId = getDisplayAffinity();
	requests.getMasterVolume = Audio.getMasterVolume({
		sessionId: currentDisplayId,
		onSuccess: (res) => {
			if (res.hasOwnProperty('volumeStatus') && res.returnValue) {
				if (res.volumeStatus && res.volumeStatus.volume) {
					update(state => {
						state.volume.master = res.volumeStatus.volume;
					});
				} else {
					console.warn(`check response`, res);
				}
			}
		},
		onComplete: () => {
			cancelRequest('getMasterVolume');
		}
	});
};

class AppBase extends React.Component {
	static propTypes = {
		onChangeVolume: PropTypes.func,
		onHandleHide: PropTypes.func,
		onHideVolumeControl: PropTypes.func,
		onShowVolumeControl: PropTypes.func,
		setMasterVolume: PropTypes.func,
		volumeControlRunning: PropTypes.bool,
		volumeControlType: PropTypes.string,
		volumeControlVisible: PropTypes.bool
	}

	constructor (props) {
		super(props);
		this.state = {};
	}

	componentWillUnmount () {
		cancelAllRequests();
	}

	hideTimerId = null

	resetStatus = () => {
		this.setState({});
	}

	render () {
		const {
			className,
			onChangeVolume,
			onHandleHide,
			onHideVolumeControl,
			onShowVolumeControl,
			volumeControlRunning,
			volumeControlType,
			volumeControlVisible,
			...rest
		} = this.props;

		delete rest.setMasterVolume;

		return (
			<div {...rest} className={classNames(className, css.app, __MOCK__ ? css.withBackground : null)}>
				<Transition css={css} type="fade" visible={volumeControlVisible}>
					<div className={css.basement} onClick={onHideVolumeControl} />
				</Transition>
				<Transition css={css} onHide={onHandleHide} type={volumeControlType} visible={volumeControlVisible}>
					{volumeControlRunning ? <VolumeControls onChangeVolume={onChangeVolume} /> : null}
				</Transition>
				{__MOCK__ && (
					<div className={css.control}>
						<Button onClick={onShowVolumeControl}>Open Volume</Button>
					</div>
				)}
			</div>
		);
	}
}

const AppDecorator = compose(
	AgateDecorator({
		noAutoFocus: true,
		overlay: true
	}),
	ProviderDecorator({
		state: initialState()
	}),
	ConsumerDecorator({
		mount: (props, {update}) => {
			const currentDisplayId = getDisplayAffinity();
			document.title = `${document.title} - Display ${currentDisplayId}`;
			getMasterVolume(update);

			document.addEventListener('webOSLocaleChange', () => {
				window.location.reload();
			});
			document.addEventListener('webOSRelaunch', () => {
				getMasterVolume(update);
				update(state => {
					state.app.running = true;
					state.app.visible.type = 'slide';
					state.app.visible.volumeControl = true;
				});
				setHideTime(update);
			});

			update(state => {
				state.app.running = true;
			});
			return () => {
				clearHideTime();
			};
		},
		handlers: {
			onHandleHide: (ev, props, {update}) => {
				update(state => {
					state.app.visible.type = 'slide';
					state.app.running = false;
				});
				window.close();
			},
			onChangeVolume: (ev, props, {update}) => {
				setHideTime(update);
			},
			onHideVolumeControl: (ev, props, {update}) => {
				update(state => {
					state.app.visible.type = 'fade';
					state.app.visible.volumeControl = false;
				});
			},
			onShowVolumeControl: (ev, props, {update}) => {
				update(state => {
					state.app.running = true;
					state.app.visible.type = 'slide';
					state.app.visible.volumeControl = true;
				});
				setHideTime(update);
			},
			setMasterVolume: (volume, props, {update}) => {
				update(state => {
					state.volume.master = volume;
				});
			}
		},
		mapStateToProps: ({app}) => ({
			volumeControlRunning: app.running,
			volumeControlType: app.visible.type,
			volumeControlVisible: app.visible.volumeControl
		})
	})
);

const App = AppDecorator(AppBase);

export default App;
