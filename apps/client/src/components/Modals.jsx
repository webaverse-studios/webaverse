import * as React from 'react';
import {AppContext} from './App';
import {Location} from './Location';
import {Settings} from './Settings';
import {Modal} from './Modal';

export default function Modals() {
  const {state} = React.useContext(AppContext);
  if (state?.openedModal === 'settings') {
    return <Modal component={Settings} title="Settings" />;
  } else if (state?.openedModal === 'location') {
    return <Modal component={Location} title="Location" />;
  } else {
    return null;
  }
}