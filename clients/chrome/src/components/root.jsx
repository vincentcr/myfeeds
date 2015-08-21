import React from 'react';
import { Redirect, Router, Route } from 'react-router';
import History from 'react-router/lib/HashHistory';
import { Provider } from 'react-redux';
import configureStore from '../stores';
import {App, Signin, FeedList, Feed} from '.';
import Session from '../session';
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
    const history = new History();
    return (
      <Router history={history}>
        <Route onEnter={this.checkAccess} component={App}>
          <Route name="signin" path="signin" component={Signin}/>
          <Route path="/feeds" component={FeedList}>
            <Route name="feed" path="/feeds/:feedID" component={Feed}/>
          </Route>
        </Route>
        <Redirect from="/" to="/feeds" />
      </Router>
    );
  }

  static checkAccess(route, transition) {
    const path = route.location.pathname.replace(/^(.+?)(\?.+)$/, '$1'); //remove query from path
    const isAnonymousRoute = ANONYMOUS_ROUTES.indexOf(path) >= 0;
    const isSignedIn = Session.get('user') != null;

    let redirect;
    if (!isSignedIn && !isAnonymousRoute) {
      redirect = { path: ANONYMOUS_ROUTES[0], query: { next: transition.path }};
    } else if (isSignedIn && isAnonymousRoute) {
      redirect = { path: '/' };
    }

    console.log('checkAccess:', {transition, path, isAnonymousRoute, redirect});
    if (redirect != null) {
      transition.to(redirect.path, redirect.params, redirect.query);
    }

  }
}
