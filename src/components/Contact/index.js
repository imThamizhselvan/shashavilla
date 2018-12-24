import React, { Component } from 'react';
import { Header } from '../Gallery/style';
import { ContactArea, BigText, Credit } from './style';
class Contact extends Component {
  render() {
    return (
      <ContactArea id="contact">
        <Header>
          <h1>Contact</h1>
          <p> We are ready to answer all your queries</p>
        </Header>
        <BigText> You can call us anytime at +91-96296 24771 / +91- 063847 79906 </BigText>
        <Credit> Site by <a href="http://thamizh.me" target="_blank">Thamizh</a> </Credit>
      </ContactArea>
    );
  }
}

export default Contact;
