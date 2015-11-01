import React, {PropTypes} from 'react';

export default class App extends React.Component {

  static propTypes = {
    children: PropTypes.any,
  }

  render() {
    const children = this.props.children;
    return (
      <div className='app'>
        {children}
      </div>
    );
  }
}
