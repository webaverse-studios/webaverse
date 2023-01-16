import React, { useEffect, useState } from "react";

import {FTABI, NFTABI, WebaverseABI} from '../../../src/abis/contract.jsx';
import { ethers } from 'ethers'

const NFTcontractAddress = '0x3D081BF4b7eAe74e25fF1a2461f92aBc3Ea15441';

const getMetaverseData = async (tokenId) => {
    const defaultProvider = new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com/')
    const NFTcontract = new ethers.Contract(NFTcontractAddress, NFTABI, defaultProvider);

    const _isServerSigned = await NFTcontract.isServerSigned(tokenId);

    if (_isServerSigned) {
        const content_url = await NFTcontract.getTokenContentURL(tokenId)

        let metaverse_url = content_url.split("index.js")[0] + '.metaversefile';

        try {

            let res = await fetch(metaverse_url);
            let data = await res.json();
            return data

        } catch(err) {
            console.log("err", err)
            return {};
        }

    } else {
        console.log("content:", "no server mint")
        return {}
    }
}


const MetadataObject = async (req, res) => {

    const reqUrlClean = req.url.replace(/\?.*$/, "");
    console.log("clean url", reqUrlClean)
    const match = reqUrlClean.match(/^\/api\/metadata\/([^\/]*)/);

    let id = match ? match[1] : "";

    let metadata =    
    {
        name: "",
        description: "",
        image: "",
        animation_url: "",
        attributes: [
        ]
    };
        
    const metaversefile_data = await getMetaverseData(id)

    console.log("metavese", metaversefile_data)
    
    metadata.name = metaversefile_data.name ? metaversefile_data.name : "";
    metadata.description = metaversefile_data.description ? metaversefile_data.description : "";


    res.status(200).json(metadata);

};


export default MetadataObject;
