'use strict';

import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'redux/react';
import { bindActionCreators } from 'redux';
import {Users} from './api';
import Session from './session';
import * as Actions from './actions';

const ANONYMOUS_ROUTES = ['/signin', '/signup'];

export class App extends React.Component {

  static propTypes = {
    children: PropTypes.any,
  }

  static willTransitionTo(transition) {
    const route = transition.path.replace(/^(.+?)(\?.+)$/, '$1');
    const isAnonymousRoute = ANONYMOUS_ROUTES.indexOf(route) >= 0;
    const isSignedIn = Session.get('user') != null;

    console.log('transition', {transition, route, isAnonymousRoute});

    if (!isSignedIn && !isAnonymousRoute) {
      transition.redirect(ANONYMOUS_ROUTES[0], {}, { next: transition.path });
    } else if (isSignedIn && isAnonymousRoute) {
      transition.redirect('/');
    }
  }

  render() {
    return (
      <div>
        <h1>My Feeds</h1>
        <div className="main">
          {this.props.children}
        </div>
      </div>
    );
  }
}

export class Signin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }

  handleSubmit(e) {
    e.preventDefault();

    const email = React.findDOMNode(this.refs.email).value.trim();
    const password = React.findDOMNode(this.refs.password).value.trim();
    const method = document.activeElement.name;

    Users[method]({email, password}).then(() => {
      this.context.router.transitionTo('/feeds');
    }).catch((err) => {
      console.log('error', err);
      this.setState({error: err.toString()});
    });

  }

  render() {
    return (
      <form className='signin-form' role='form' onSubmit={this.handleSubmit.bind(this)} >
        <div className='form-group'>
          <input type='email' ref='email' placeholder='Email' required />
          <input type='password' ref='password' placeholder='Password' required />
        </div>
        <input type='submit' value='sign in' name='signin' />
        <input type='submit' value='sign up' name='signup' />
        <div className='error'>
          {this.state.error}
        </div>
      </form>
    );
  }
}
Signin.contextTypes = {
  router: PropTypes.func.isRequired,
};


@connect()
export class Feeds extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  render() {
    const { dispatch } = this.props;
    const actions = bindActionCreators(Actions, dispatch);

    return (
      <div className="feeds">
        <FeedList actions={actions} {...this.props} />

        { //this will render the child routes
          this.props.children && React.cloneElement(this.props.children, { actions, ...this.props })
        }
      </div>
    );
  }

}

class FeedList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const feedNodes = this.props.feeds.map( (feed) => {
      return (
        <li key={feed.id}>
          <Link to='feed' params={{feedID: feed.id}}>{feed.title}</Link>
        </li>
      );
    });

    return (
      <ul className='feed-list'>
        {feedNodes}
      </ul>
    );
  }
}
FeedList.propTypes = {
  feeds: PropTypes.array,
};



export class Feed extends React.Component {
  render() {
    return (
      <div className='feed'>
        <h2 className='title'> {this.props.title} </h2>
        <FeedItemList items={this.props.items} />
      </div>
    );
  }
}

class FeedItemList extends React.Component {
  render() {
    const itemNodes = this.props.items.map( (item) => {
      return (
        <li key={item.id}>
          <a href='{item.link}'>{item.title}</a>
        </li>
      );
    });

    return (
      <ul className='items'>
        {itemNodes}
      </ul>
    );
  }
}
