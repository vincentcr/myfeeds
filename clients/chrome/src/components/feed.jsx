import React, {PropTypes} from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import history from '../history';
import {
  fetchCurrentFeedIfNeeded,
  saveFeed,
  deleteFeed,
} from '../actions';

@connect(state => state.feed)
export default class Feed extends React.Component {

  constructor() {
   super();
   this.state = { };
  }

  static propTypes = {
    children: PropTypes.any,
    dispatch: PropTypes.func.isRequired,
  }

  componentDidMount() {
    this._loadFeed(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this._loadFeed(nextProps);
  }

  _loadFeed(props) {
    const newFeedID = props.params.feedID;
    const {feedID} = this.state;
    if (newFeedID !== feedID) {
      console.log(`loadFeed:${newFeedID}; current:${feedID}`);
      const {dispatch} = this.props;
      this.setState({feedID:newFeedID});
      dispatch(fetchCurrentFeedIfNeeded(newFeedID));
    }
    const feed = props.feed ? {...props.feed} : null;
    this.setState({feed, isModified:false});
  }

  render() {
    const cssClasses = classNames({
      'edit-mode' : this.props.isEditing,
    });
    const {feed} = this.state;
    const {params, children} = this.props;

    return (
      <div className={'feed ' + cssClasses}>
        {!feed &&
          <div className='loading'>Loading...</div>
        }
        {feed &&
          <div>
            <div className='row titlebar'>
              <div className='col-md12'>
                {this.renderTitleBar(feed)}
              </div>
            </div>
            <div className='row'>
              <div className='col-md-6'>
                <FeedItemTable ref='itemList' params={params} feed={feed} />
                <div className='feed-item-add-new'>
                  <button onClick={(e) => this.handleAddItem(e)} className='btn btn-default'>Add Feed Item</button>
                </div>
              </div>
              <div className='col-md-6'>
                {children}
              </div>
            </div>
          </div>
        }
      </div>
    );
  }

  renderTitleBar(feed) {
    return (
      <div>
        {this.renderTitle(feed)}
        {' '}
        <div className='dropdown feed-menu'>
          <button className="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
            <span className="glyphicon glyphicon-cog" aria-hidden="true"></span>
          </button>
          <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
            <li><a href="#" onClick={e => this.handleDelete(e)}>
                <span className='glyphicon glyphicon-trash' aria-hidden="true"></span>
                {' '}
                delete feed
            </a></li>
          </ul>
        </div>
      </div>
    );
  }

  renderTitle(feed) {
    const handleOnChange = this.handleOnChange.bind(this, 'title');

    function handleOnBlur(e) {
      //using this hidden button trick, we can trigger browser form validation
      const button = e.target.form.querySelector('button');
      setTimeout(() => button.click(), 0);
    }

    return (
      <h2 className='title'>
        <form onSubmit={e => this.handleSave(e)}>
          <input type='text' className="form-control" placeholder='title' required='required'
            value={feed.title} size={feed.title.length}
            onChange={handleOnChange} onBlur={handleOnBlur}
          />
        <button style={{display:'none'}} type='submit' />
      </form>
      </h2>
    );
  }

  handleSave(e) {
    e.preventDefault();
    const {feed, isModified} = this.state;
    if (isModified) {
      this.props.dispatch(saveFeed(feed));
    }
  }

  handleOnChange(field, e) {
    const feed = {...this.state.feed, [field] : e.target.value };
    this.setState({ isModified: true, feed:feed });
  }

  handleDelete(e) {
    const {feed} = this.state;
    const {dispatch} = this.props;
    e.preventDefault();
    if (window.confirm(`Delete feed ${feed.title}? This action cannot be undone.`)) {
      dispatch(deleteFeed(feed));
    }
  }

  handleAddItem(e) {
    e.preventDefault();
    const {feed} = this.props;
    showItemDetails({feedID:feed.id, itemID:'new'});
  }
}

class FeedItemTable extends React.Component {

  getItems() {
    const items = Object.keys(this.refs)
      .filter(key => key.startsWith('item_'))
      .map(key => this.refs[key]);
    return items;
  }

  render() {
    const {feed, params} = this.props;
    const itemNodes = feed.items.map((item, idx) => React.createElement(FeedItemRow, {
        item,
        params,
        idx: idx,
        key: item.id,
        ref: `item_${idx}`,
    }));
    const showAsEmpty = itemNodes.length === 0;
    return (
      <table className='feed-item-table table table-condensed' style={{width: 'auto'}}>
        <thead>
          <tr>
            <th></th>
            <th> title </th>
            <th> link </th>
            <th> description </th>
          </tr>
        </thead>
        <tbody>
          {itemNodes}
          {showAsEmpty &&
            <tr className='empty-feed'>
              <td colSpan='4'>(empty)</td>
            </tr>
          }
        </tbody>
      </table>
      );
  }
}

class FeedItemRow extends React.Component {

  constructor(props) {
    super(props);
    const {item} = this.props;
    this.state = {...item};
  }

  render() {
    const {idx,item,params} = this.props;
    const {feedID, itemID} = params;
    const cssClasses = classNames({
      'selected' : itemID === item.id,
    });
    const onClick = () => showItemDetails({feedID, itemID:item.id});
    return (
      <tr className={cssClasses} onClick={onClick}>
        <td>{idx + 1}.</td>
        <td>{item.title}</td>
        <td>
          {item.link}
          {' '}
          <a href={item.link} target={item.id} className='item-link'>
              <span className="glyphicon glyphicon-new-window" aria-hidden="true"></span>
          </a>
        </td>
        <td>{item.description}</td>
      </tr>
    );
  }
}

function showItemDetails({feedID, itemID}) {
  const url = `/feeds/${feedID}/items/${itemID}`;
  history.replaceState(null, url);
}
