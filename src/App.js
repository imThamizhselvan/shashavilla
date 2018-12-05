import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import TopBar from './TopBar';
import MenuBar from './MenuBar';
import logo from './logo.svg';
import './App.css';

const Index = () => <h2>Home</h2>;
const About = () => <h2>About</h2>;
const Users = () => <h2>Users</h2>;
const AppRouter = () => (
  <Router>
    <div>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about/">About</Link>
          </li>
          <li>
            <Link to="/users/">Users</Link>
          </li>
        </ul>
      </nav>

      <Route path="/" exact component={Index} />
      <Route path="/about/" component={About} />
      <Route path="/users/" component={Users} />
    </div>
  </Router>
);

class App extends Component {
  render() {
    return (
      <div className="App">
        <TopBar />
        <MenuBar />
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Welcome to Shasha Villa
            <AppRouter />
          </p>
        </header>
      </div>
    );
  }
}

export default App;
