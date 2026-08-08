const fs = require('fs');
let code = fs.readFileSync('src/components/VisualBlockEditor.tsx', 'utf8');

const regexImport = /import Editor from "react-simple-wysiwyg";/;
const newImport = `import {
  EditorProvider,
  Editor as WysiwygEditor,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnNumberedList,
  BtnBulletList,
  BtnLink,
  BtnClearFormatting,
  createDropdown,
  Separator,
  BtnUndo,
  BtnRedo
} from "react-simple-wysiwyg";

const BtnStylesCustom = createDropdown('Estilos', [
    ['Normal', 'formatBlock', 'DIV'],
    ['Título', 'formatBlock', 'H1'],
    ['Subtítulo', 'formatBlock', 'H2'],
    ['Código', 'formatBlock', 'PRE'],
]);

const CustomEditor = (props: any) => {
  return (
    <EditorProvider>
      <WysiwygEditor {...props}>
        <Toolbar>
          <BtnUndo />
          <BtnRedo />
          <Separator />
          <BtnBold />
          <BtnItalic />
          <BtnUnderline />
          <BtnStrikeThrough />
          <Separator />
          <BtnNumberedList />
          <BtnBulletList />
          <Separator />
          <BtnLink />
          <BtnClearFormatting />
          <Separator />
          <BtnStylesCustom />
        </Toolbar>
      </WysiwygEditor>
    </EditorProvider>
  );
};
`;

code = code.replace(regexImport, newImport);
code = code.replace(/<Editor/g, '<CustomEditor');
fs.writeFileSync('src/components/VisualBlockEditor.tsx', code);
console.log("Patched CustomEditor in VisualBlockEditor.tsx");
