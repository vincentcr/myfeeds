import React from 'react';
import {Users} from '../api';
import history from '../history';

const SUCCESS_REDIRECT_PATH = '/';

export default class Signin extends React.Component {
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
    const method = document.activeElement.name || 'signin';

    Users[method]({email, password}).then(() => {
      const {location} = this.props;
      const redirectPath = (location.state && location.state.next) ? location.state.next : SUCCESS_REDIRECT_PATH;
      history.replaceState(null, redirectPath);
    }).catch  ((err) => {
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
