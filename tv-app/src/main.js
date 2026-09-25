import './styles.css';
import App from './components/App.js';

const app = document.querySelector('#app');
app.innerHTML = '';
app.appendChild(App());
