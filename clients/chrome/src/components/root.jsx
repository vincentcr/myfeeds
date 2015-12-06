import React from 'react';
import { render } from 'react-dom';
import { Redirect, Router, Route, IndexRoute } from 'react-router';
import history from '../history';
import { Provider } from 'react-redux';
import configureStore from '../stores';

import {Users} from '../api';
import App from './app.jsx';
import Signin from './signin.jsx';
import FeedList from './feeds.jsx';
import FeedItem from './feedItem.jsx';
import Feed from './feed.jsx';

const ANONYMOUS_ROUTES = ['/signin', '/signup'];

export default class Root {

  static create(rootNode) {
    const store = configureStore();

    render(
      <Provider store={store}>
        <Routes />
      </Provider>,
      rootNode
    );
  }
}

class Routes extends React.Component {
  render() {
    return (
      <Router history={history}>
        <Route path='/' component={App} onEnter={this.checkAccess}>
          <IndexRoute component={FeedList} />
          <Route path='signin' name='signin' onEnter={this.checkAccess} component={Signin}/>
          <Route path='feeds' name='feeds'  onEnter={this.checkAccess} component={FeedList}>
            <Route path=':feedID' name='feed' onEnter={this.checkAccess} component={Feed}>
              <Route path='items/:itemID' name='item' onEnter={this.checkAccess} component={FeedItem} />
            </Route>
          </Route>
        </Route>
        <Redirect from='/' to='/feeds' />
        <Route path='*' component={NotFound} />
      </Router>
    );
  }

  checkAccess(nextState, replaceState) {
    const path = nextState.location.pathname.replace(/^(.+?)(\?.+)$/, '$1'); //remove query from path
    const isAnonymousRoute = ANONYMOUS_ROUTES.indexOf(path) >= 0;
    const isSignedIn = Users.isSignedIn();

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

class NotFound extends React.Component {
  render() {
    return (
      <div>not found :(</div>
    );
  }
}
