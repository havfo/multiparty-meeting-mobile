import domready from 'domready';
import React, { Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createIntl, createIntlCache, RawIntlProvider } from 'react-intl';
import { IonApp } from '@ionic/react';
import { Route } from 'react-router-dom';
import { IonReactRouter as Router } from '@ionic/react-router';
import randomString from 'random-string';
import Logger from './Logger';
import debug from 'debug';
import RoomClient from './RoomClient';
import RoomContext from './RoomContext';
import deviceInfo from './deviceInfo';
import * as meActions from './actions/meActions';
import ChooseRoom from './components/ChooseRoom';
import LoadingView from './components/LoadingView';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { persistor, store } from './store';
import { SnackbarProvider } from 'notistack';
import * as serviceWorker from './serviceWorker';
import { ReactLazyPreload } from './components/ReactLazyPreload';

// import messagesEnglish from './translations/en';
import messagesNorwegian from './translations/nb';
import messagesGerman from './translations/de';
import messagesHungarian from './translations/hu';
import messagesPolish from './translations/pl';

import './index.css';
import '@ionic/react/css/core.css';

const App = ReactLazyPreload(() => import(/* webpackChunkName: "app" */ './components/App'));

const cache = createIntlCache();

const messages =
{
	// 'en' : messagesEnglish,
	'nb' : messagesNorwegian,
	'de' : messagesGerman,
	'hu' : messagesHungarian,
	'pl' : messagesPolish
};

const locale = navigator.language.split(/[-_]/)[0]; // language without region code

const intl = createIntl({
	locale,
	messages : messages[locale]
}, cache);

if (process.env.REACT_APP_DEBUG === '*' || process.env.NODE_ENV !== 'production')
{
	debug.enable('* -engine* -socket* -RIE* *WARN* *ERROR*');
}

const logger = new Logger();

let roomClient;

RoomClient.init({ store, intl });

const theme = createMuiTheme(window.config.theme);

domready(() =>
{
	logger.debug('DOM ready');

	run();
});

function run()
{
	logger.debug('run() [environment:%s]', process.env.NODE_ENV);

	const peerId = randomString({ length: 8 }).toLowerCase();
	const urlParser = new URL(window.location);
	const parameters = urlParser.searchParams;

	const accessCode = parameters.get('code');
	const produce = parameters.get('produce') !== 'false';
	const useSimulcast = parameters.get('simulcast') === 'true';
	const forceTcp = parameters.get('forceTcp') === 'true';

	// Get current device.
	const device = deviceInfo();

	store.dispatch(
		meActions.setMe({
			peerId,
			loginEnabled : window.config.loginEnabled
		})
	);

	roomClient = new RoomClient(
		{ peerId, accessCode, device, useSimulcast, produce, forceTcp });

	global.CLIENT = roomClient;

	render(
		<IonApp>
			<Provider store={store}>
				<MuiThemeProvider theme={theme}>
					<RawIntlProvider value={intl}>
						<PersistGate loading={<LoadingView />} persistor={persistor}>
							<RoomContext.Provider value={roomClient}>
								<SnackbarProvider>
									<Router>
										<Suspense fallback={<LoadingView />}>
											<React.Fragment>
												<Route exact path='/' component={ChooseRoom} />
												<Route path='/:id' component={App} />
											</React.Fragment>
										</Suspense>
									</Router>
								</SnackbarProvider>
							</RoomContext.Provider>
						</PersistGate>
					</RawIntlProvider>
				</MuiThemeProvider>
			</Provider>
		</IonApp>,
		document.getElementById('multiparty-meeting')
	);
}

serviceWorker.unregister();
