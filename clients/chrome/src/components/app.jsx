import React, {PropTypes} from 'react';
import Session from '../session';
const ANONYMOUS_ROUTES = ['/signin', '/signup'];

export default class App extends React.Component {

  static propTypes = {
    children: PropTypes.any,
  }

  static willTransitionTo(transition) {
    const path = transition.path.replace(/^(.+?)(\?.+)$/, '$1'); //remove query from path
    const isAnonymousRoute = ANONYMOUS_ROUTES.indexOf(path) >= 0;
    const isSignedIn = Session.get('user') != null;

    let redirect;
    if (!isSignedIn && !isAnonymousRoute) {
      redirect = { path: ANONYMOUS_ROUTES[0], query: { next: transition.path }};
    } else if (isSignedIn && isAnonymousRoute) {
      redirect = { path: '/' };
    }

    console.log('willTransitionTo:', {transition, path, isAnonymousRoute, redirect});
    if (redirect != null) {
      transition.redirect(redirect.path, redirect.params, redirect.query);
    }
  }

  render() {

    const user = Session.get('user');

    return (
      <div>
        <h1>My Feeds</h1>
        {user &&
          <h3 className='user-info'>Welcome, {user.email}</h3>
        }
        <div className="main">
          {this.props.children}
        </div>
      </div>
    );
  }
}
