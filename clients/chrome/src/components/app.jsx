import React, {PropTypes} from 'react';
import Session from '../session';

export default class App extends React.Component {

  static propTypes = {
    children: PropTypes.any,
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
