import React, { Component } from 'react'
import { render } from 'react-dom'
import { Editor, EditorState, RichUtils, Entity, CompositeDecorator, convertToRaw } from 'draft-js'
import { stateToHTML } from 'draft-js-export-html'
import { stateFromHtml } from 'draft-js-import-html'
import './test.css'

class MyEditor extends Component {
  constructor(props) {
    super(props);

    const decorator = new CompositeDecorator([
      {
        strategy: findLinkEntities,
        component: Link
      }
    ]);

    this.state = {
      editorState: EditorState.createEmpty(decorator),
      showURLInput: false,
      urlValue: ''
    };

    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({ editorState });

    this.handleKeyCommand = this._handleKeyCommand.bind(this);
    this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
    this.toggleBlockType = this._toggleBlockType.bind(this);

    this.promptForLink = this._promptForLink.bind(this);
    this.onURLChange = (e) => this.setState({ urlValue: e.target.value });
    this.confirmLink = this._confirmLink.bind(this);
    this.onLinkInputKeyDown = this._onLinkInputKeyDown.bind(this);
    this.removeLink = this._removeLink.bind(this);

    this.undo = this._undo.bind(this);
    this.redo = this._redo.bind(this);

    this.toString = this._toString.bind(this);

    this.logState = () => {
      const content = this.state.editorState.getCurrentContent();
      console.log(convertToRaw(content));
      console.log(this.state.editorState.getSelection());
    };
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    )
  }

  _handleKeyCommand(command) {
    const newState = RichUtils.handleKeyCommand(this.state.editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _promptForLink(e) {
    e.preventDefault();
    const { editorState } = this.state;
    const selection = editorState.getSelection();
    if(!selection.isCollapsed()) {
      this.setState({
        showURLInput: true,
        urlValue: '',
      }, () => {
        setTimeout(() => this.refs.url.focus(), 0);
      });
    }
  }

  _confirmLink(e) {
    e.preventDefault();
    const { editorState, urlValue } = this.state;
    const entityKey = Entity.create('LINK', 'MUTABLE', { url: urlValue });
    this.setState({
      editorState: RichUtils.toggleLink(
        editorState,
        editorState.getSelection(),
        entityKey
      ),
      showURLInput: false,
      urlValue: ''
    }, () => {
      setTimeout(() => this.refs.editor.focus(), 0);
    });
  }

  _onLinkInputKeyDown(e) {
    if(e.which === 13) {
      this._confirmLink(e);
    }
  }

  _removeLink(e) {
    e.preventDefault();
    const { editorState } = this.state;
    const selection = editorState.getSelection();
    if(!selection.isCollapsed()) {
      this.setState({
        editorState: RichUtils.toggleLink(editorState, selection, null),
      })
    }
  }

  _undo(e) {
    e.preventDefault();
    const { editorState } = this.state;
    this.onChange(
      EditorState.undo(editorState)
    );
  }

  _redo(e) {
    e.preventDefault();
    const { editorState } = this.state;
    this.onChange(
      EditorState.redo(editorState)
    );
  }

  _toString() {
    const { editorState } = this.state;
    let contentState = editorState.getCurrentContent();
    console.log(stateToHTML(contentState));
  }

  render() {
    const { editorState } = this.state;
    let urlInput;
    if(this.state.showURLInput) {
      urlInput =
        <div>
          <input
            onChange={this.onURLChange}
            ref="url"
            type="text"
            value={this.state.urlValue}
            onKeyDown={this.onLinkInputKeyDown}
          />
          <button onMouseDown={this.confirmLink}>
            Confirm
          </button>
        </div>
    }
    return (
      <div style={styles.root}>
        <InlineStyleControls
          editorState={editorState}
          onToggle={this.toggleInlineStyle}
         />
         <BlockStyleControls
          editorState={editorState}
          onToggle={this.toggleBlockType}
        />
        <div>
          <button onMouseDown={this.promptForLink}>
            Add Link
          </button>
          <button onMouseDown={this.removeLink}>
            RemoveLink
          </button>
        </div>
        <div>
          <button disabled={editorState.getUndoStack().isEmpty()} onClick={this.undo}>Undo</button>
          <button disabled={editorState.getRedoStack().isEmpty()} onClick={this.redo}>Redo</button>
        </div>
        {urlInput}
        <div style={styles.editor} onClick={this.focus}>
          <Editor
            blockStyleFn={getBlockStyle}
            editorState={editorState}
            onChange={this.onChange}
            handleKeyCommand={this.handleKeyCommand}
            ref="editor"
          />
        </div>
        <button onClick={this.logState}>logState</button>
        <button onClick={this.toString}>stateToHTML</button>
      </div>
    )
  }
}

function findLinkEntities(contentBlock, callback) {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        Entity.get(entityKey).getType() === 'LINK'
      );
    },
    callback
  );
}

const Link = (props) => {
  const { url } = Entity.get(props.entityKey).getData();
  return (
    <a href={url} style={styles.link}>
      {props.children}
    </a>
  )
}

function getBlockStyle(block) {
  switch(block.getType()) {
    case 'blockquote': return 'blockquote';
    default: return null;
  }
}

class StyleButton extends Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    return (
      <button className='style-button' onMouseDown={this.onToggle}>
        {this.props.text}
      </button>
    );
  }
}

const BLOCK_TYPES = [
  {text: 'UL', style: 'unordered-list-item'},
  {text: 'OL', style: 'ordered-list-item'},
  {text: 'Blockquote', style: 'blockquote'},
]

const BlockStyleControls = (props) => {
  const { editorState } = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

    return (
      <div className="block-controls">
        {BLOCK_TYPES.map((type) =>
          <StyleButton
            key={type.text}
            active={type.style === blockType}
            text={type.text}
            onToggle={props.onToggle}
            style={type.style}
          />
        )}
      </div>
    )
}

const INLINE_STYLES = [
  {text: 'Bold', style: 'BOLD'},
  {text: 'Italic', style: 'ITALIC'},
  {text: 'Underline', style: 'UNDERLINE'},
];

const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="inline-controls">
      {INLINE_STYLES.map(type =>
        <StyleButton
          key={type.text}
          actice={currentStyle.has(type.style)}
          text={type.text}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  )
}

const styles = {
  root: {
    fontFamily: '\'Helvetica\', sans-serif',
    padding: 20,
    width: 600
  },
  editor: {
    border: '1px solid #ccc',
    cursor: 'text',
    minHeight: 80,
    padding: 10
  },
  link: {
    color: '#3b5998',
    textDecoration: 'underline',
  }
}

render(
  <MyEditor />,
  document.getElementById('app')
)
