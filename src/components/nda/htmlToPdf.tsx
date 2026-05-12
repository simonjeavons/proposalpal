import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
  paragraph: { fontSize: 9, color: '#222222', lineHeight: 1.5, marginBottom: 4 },
  list: { marginLeft: 14, marginBottom: 4 },
  listItem: { fontSize: 9, color: '#222222', lineHeight: 1.5, marginBottom: 2, flexDirection: 'row' },
  listMarker: { width: 14 },
  listText: { flex: 1 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
});

type AnyNode = Element | ChildNode;

function parseHtml(html: string): Element {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html || '';
  return wrapper;
}

interface InlineStyle { bold?: boolean; italic?: boolean; underline?: boolean }

function renderInline(node: AnyNode, style: InlineStyle, keyPrefix: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return null;
    const styleArr: any[] = [];
    if (style.bold) styleArr.push(pdfStyles.bold);
    if (style.italic) styleArr.push(pdfStyles.italic);
    if (style.underline) styleArr.push({ textDecoration: 'underline' });
    return <Text key={keyPrefix} style={styleArr.length ? styleArr : undefined}>{text}</Text>;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const childStyle: InlineStyle = { ...style };
  if (tag === 'strong' || tag === 'b') childStyle.bold = true;
  if (tag === 'em' || tag === 'i') childStyle.italic = true;
  if (tag === 'u') childStyle.underline = true;
  if (tag === 'br') return <Text key={keyPrefix}>{'\n'}</Text>;
  return (
    <React.Fragment key={keyPrefix}>
      {Array.from(el.childNodes).map((c, i) => renderInline(c, childStyle, `${keyPrefix}.${i}`))}
    </React.Fragment>
  );
}

function renderBlock(node: AnyNode, key: string): React.ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || '').trim();
    if (!text) return null;
    return <Text key={key} style={pdfStyles.paragraph}>{text}</Text>;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'p' || tag === 'div') {
    return (
      <Text key={key} style={pdfStyles.paragraph}>
        {Array.from(el.childNodes).map((c, i) => renderInline(c, {}, `${key}.${i}`))}
      </Text>
    );
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(el.children).filter(c => c.tagName.toLowerCase() === 'li');
    return (
      <View key={key} style={pdfStyles.list}>
        {items.map((li, i) => (
          <View key={`${key}.${i}`} style={pdfStyles.listItem}>
            <Text style={pdfStyles.listMarker}>{tag === 'ol' ? `${i + 1}.` : '•'}</Text>
            <Text style={pdfStyles.listText}>
              {Array.from(li.childNodes).map((c, j) => renderInline(c, {}, `${key}.${i}.${j}`))}
            </Text>
          </View>
        ))}
      </View>
    );
  }
  // Unknown block-level tag — render its children inline as a paragraph.
  return (
    <Text key={key} style={pdfStyles.paragraph}>
      {Array.from(el.childNodes).map((c, i) => renderInline(c, {}, `${key}.${i}`))}
    </Text>
  );
}

export function HtmlToPdf({ html }: { html: string }) {
  if (!html) return null;
  const root = parseHtml(html);
  const blocks: React.ReactNode[] = [];
  Array.from(root.childNodes).forEach((child, i) => {
    const rendered = renderBlock(child, `b${i}`);
    if (rendered) blocks.push(rendered);
  });
  return <>{blocks}</>;
}
