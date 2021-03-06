import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import history from '../history';
import {
  saveFeedItem,
  deleteFeedItem,
} from '../actions';

@connect(state => state.feed)
export default class FeedItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.setItem(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.setItem(nextProps);
  }

  setItem(props) {
    const {feed} = props;
    if (feed != null) {
      const {itemID} = props.params;
      const isNew = 'new' === itemID;
      let item;
      if (isNew) {
        item = {};
      } else {
        item = itemID != null ? feed.items.find((item) => item.id === itemID) : { };
      }
      this.setState({itemID, item, isNew, isModified:isNew});
    }
  }

  render() {
    const {item, isModified,itemID} = this.state;
    if (itemID == null) {
      return <div></div>;
    }
    else if (item == null) {
      return <div>loading...</div>;
    }
    const lastModified = moment(item.date_modified).format('YYYY-MM-DD HH:mm:ss');

    return (
        <form onSubmit={e => this.handleSave(e)}>
          <div className='form-group'>
            <label htmlFor='item-title'>Title</label>
            <input type='text' className='form-control' required='required' id='item-title' value={item.title} placeholder='title'
              onChange={(e) => this.handleOnChange('title', e)}
            />
          </div>
          <div className='form-group'>
            <label htmlFor='item-link'>Link</label>
            <input type='url' className='form-control' id='item-link'  required='required' value={item.link} placeholder='http://'
              onChange={(e) => this.handleOnChange('link', e)}
            />
          </div>
          <div className='form-group'>
            <label htmlFor='item-description'>description</label>
            <textarea className='form-control' id='item-description' value={item.description} placeholder='description'
              onChange={(e) => this.handleOnChange('description', e)}
            />
          </div>
          <div>
            <label>last modified:</label>{' ' + lastModified}<br />
          </div>
          <button type='submit' className='btn btn-default' disabled={!isModified}>
            <span className='glyphicon glyphicon-save' aria-hidden="true"></span>
            {' '}
            save
          </button>
          {' '}
          <button className='btn btn-default' onClick={e => this.handleCancel(e)} >
            {' '}
            cancel
          </button>
          {' '}
          <button className='btn btn-save btn-danger' onClick={e => this.handleDelete(e)} >
            <span className='glyphicon glyphicon-trash' aria-hidden="true"></span>
            {' '}
            delete
          </button>
        </form>
    );

  }

  handleSave(e) {
    e.preventDefault();
    const {item, isModified, isNew} = this.state;
    if (isModified) {
      const {dispatch, feed} = this.props;
      dispatch(saveFeedItem(feed, item, (savedItem) => {
        if (isNew) { //update url
          history.replaceState(null, `/feeds/${feed.id}/items/${savedItem.id}`);
        }
      }));
    }
  }

  handleCancel(e) {
    e.preventDefault();
    const {isModified} = this.state;
    if (!isModified || window.confirm('Changes have not been saved. Continue?')) {
      const {history,feed} = this.props;
      history.replaceState(null, `/feeds/${feed.id}`);
    }
  }

  handleOnChange(field, e) {
    const item = {...this.state.item, [field] : e.target.value };
    this.setState({ isModified: true, item:item });
  }

  handleDelete(e) {
    e.preventDefault();
    const {item} = this.state;
    if (window.confirm(`Delete feed item ${item.title}? This cannot be undone.`)) {
      const {dispatch, feed} = this.props;
      dispatch(deleteFeedItem(feed, item));
    }
  }
}
