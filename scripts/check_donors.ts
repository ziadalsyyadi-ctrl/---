import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testParsing() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/169L0-gWsPmSez8rXivSX5kt5p278Ry6ZJDU66AC42SY/gviz/tq?tqx=out:csv&sheet=%D9%82%D8%A7%D8%A6%D9%85%D8%A9%20%D8%A3%D8%B4%D8%AE%D8%A7%D8%B5';
    const res = await fetch(csvUrl);
    const text = await res.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('Total lines in CSV:', lines.length);
    
    let parsedCount = 0;
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2) {
            const name = cols[0] || cols[1];
            if (name && name.length > 2) {
                parsedCount++;
            }
        } else {
            console.log('Skipped line', i, 'cols:', cols.length);
        }
    }
    console.log('Successfully parsed donors:', parsedCount);
}

testParsing();
