import React, {createContext} from 'react';
import * as comms from "../comms/client-comms.js";

const EngineContext = createContext();

function EngineProvider({children}) {
    return <EngineContext.Provider value={comms}>
        {children}
    </EngineContext.Provider>;
}

export {EngineContext, EngineProvider};