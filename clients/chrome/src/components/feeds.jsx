import React, {PropTypes} from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { fetchFeedsIfNeeded } from '../actions';

@connect(state => state.feedList)
export class FeedList extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(fetchFeedsIfNeeded());
  }

  render() {
    const { feeds, isFetching, children, err } = this.props;

    return (
      <div className="feeds">
        {isFetching && feeds.length === 0 &&
          <div className='loading'>Loading...</div>
        }
        {!isFetching && feeds.length === 0 &&
          <div className='emtpy'>Empty.</div>
        }
        {feeds.length > 0 &&
          <div style={{ opacity: isFetching ? 0.5 : 1 }}>
            <Feeds {...this.props} />
          </div>
        }

        { //this will render the child routes
          children && React.cloneElement(children, {...this.props })
        }

        {err &&
          <span className='error'>
            {err.message || err.toString()}
          </span>
        }
      </div>
    );
  }

}

class Feeds extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    feeds: PropTypes.array,
  }

  render() {
    const {feeds} = this.props;
    const feedNodes = feeds.map(feed => this.renderFeed(feed));
    return (
      <ul className='feed-list'>
        {feedNodes}
      </ul>
    );
  }

  renderFeed(feed) {
    return (
      <li key={feed.id}>
        <Link className='feed-link' to='feed' params={{feedID: feed.id}}>
          {feed.title}
        </Link>
        ({feed.items.length} items)
      </li>
    );
  }
}

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
