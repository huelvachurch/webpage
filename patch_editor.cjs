const fs = require('fs');
let code = fs.readFileSync('src/components/VisualBlockEditor.tsx', 'utf8');

// 1. Update imports
const importRegex = /import Editor from "react-simple-wysiwyg";/;
const newImports = `import {
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

code = code.replace(importRegex, newImports);

// 2. Replace <Editor .../> with <CustomEditor .../>
code = code.replace(/<Editor/g, '<CustomEditor');

fs.writeFileSync('src/components/VisualBlockEditor.tsx', code);
console.log("Patched VisualBlockEditor");
