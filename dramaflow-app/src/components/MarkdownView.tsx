import React from 'react';
import { renderMarkdownToHtml } from '../services/markdown';

/** Markdown 预览组件：人物描述等短文本渲染 */
const MarkdownView: React.FC<{ content: string; style?: React.CSSProperties }> = ({ content, style }) => {
  const html = renderMarkdownToHtml(content);
  return (
    <div
      className="md-view"
      style={{ fontSize: 12, color: '#5A6070', lineHeight: 1.8, fontFamily: 'Inter, sans-serif', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownView;
