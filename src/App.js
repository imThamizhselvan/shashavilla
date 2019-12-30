import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Home from './components/Home'
import logo from './logo.svg';
import './App.css';

const AppRouter = () => (
  <Router>
    <div>
      <Route path="/" component={Home} />
    </div>
  </Router>
);

class App extends Component {

  componentDidMount = () => {
    const elm = document.getElementsByClassName('lds-ring');
    if (elm.length > 0) {
      elm[0].style.display = 'none';
    }
  }

  render() {
    return (
      <div>
        <AppRouter />
      </div>
    );
  }
}

export default App;
