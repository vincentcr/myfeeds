import React from 'react';
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
    console.log('feed item', FeedItem)
    return (
      <Router history={history}>
        <Route path='/' component={App}>
          <IndexRoute component={FeedList} />
          <Route path='signin' name='signin' onEnter={this.checkAccess} component={Signin}/>
          <Route path='feeds' name='feeds'  onEnter={this.checkAccess} components={{FeedList}}>
            <Route path=':feedID' name='feed' onEnter={this.checkAccess} components={{Feed}}>
              <Route path='items/:itemID' name='item' onEnter={this.checkAccess} components={{FeedItem}} />
            </Route>
          </Route>
        </Route>
        <Redirect from='/' to='/feeds' />
        <Route path='*' component={NotFound} />
      </Router>
    );
  }

  static checkAccess(nextState, replaceState) {
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
