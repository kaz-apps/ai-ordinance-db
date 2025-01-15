const fs = require('fs').promises;
const path = require('path');

async function resetProject() {
    try {
        // .next ディレクトリの削除
        await fs.rm(path.join(__dirname, '..', '.next'), { recursive: true, force: true });
        
        // node_modules の削除
        await fs.rm(path.join(__dirname, '..', 'node_modules'), { recursive: true, force: true });
        
        // package-lock.json の削除
        await fs.rm(path.join(__dirname, '..', 'package-lock.json'), { force: true });
        
        console.log('プロジェクトのリセットが完了しました。');
        console.log('次に以下のコマンドを実行してください：');
        console.log('npm install');
    } catch (error) {
        console.error('エラーが発生しました：', error);
    }
}

resetProject(); 