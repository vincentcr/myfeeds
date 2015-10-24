import React from 'react';
import { Redirect, Router, Route } from 'react-router';
import history from '../history';
import { Provider } from 'react-redux';
import configureStore from '../stores';

import Session from '../session';
import App from './app.jsx';
import Signin from './signin.jsx';
import FeedList from './feeds.jsx';
import Feed from './feed.jsx';

const ANONYMOUS_ROUTES = ['/signin', '/signup'];
const store = configureStore();

export default class Root extends React.Component {

  static create(rootNode) {
    React.render(<Root />, rootNode);
  }

  render () {
    return (
      <Provider store={store}>
        {() => Root.renderApp()}
      </Provider>
    );
  }

  static renderApp() {
    return (
      <Router history={history}>
        <Route component={App}>
          <Route path='/signin' name='signin' onEnter={this.checkAccess} component={Signin}/>
          <Route path='/feeds' name='feeds'  onEnter={this.checkAccess}component={FeedList} />
          <Route path='/feeds/:feedID' name='feed' onEnter={this.checkAccess} component={Feed}/>
        </Route>
        <Redirect from='/' to='/feeds' />
      </Router>
    );
  }

  static checkAccess(nextState, replaceState) {
    const path = nextState.location.pathname.replace(/^(.+?)(\?.+)$/, '$1'); //remove query from path
    const isAnonymousRoute = ANONYMOUS_ROUTES.indexOf(path) >= 0;
    const isSignedIn = Session.isSignedIn();

    let redirect;
    if (!isSignedIn && !isAnonymousRoute) {
      redirect = { path: ANONYMOUS_ROUTES[0], query: { next: path }};
    } else if (isSignedIn && isAnonymousRoute) {
      redirect = { path: '/' };
    }

    console.log('onEnter:checkAccess:', { path, isSignedIn, isAnonymousRoute, redirect });
    if (redirect != null) {
      replaceState(redirect.query, redirect.path);
    }

  }
}
