import {useEffect, useState, useContext} from 'react';
import {ethers, BigNumber} from 'ethers';

import {
  CONTRACTS, OTCollectionAddress
} from './web3-constants.js';
import {FTABI, NFTABI, WebaverseABI} from '../abis/contract.jsx';
import {ChainContext} from './chainProvider.jsx';

export default function useNFTContract(currentAccount) {
  const {selectedChain} = useContext(ChainContext);
  const [WebaversecontractAddress, setWebaversecontractAddress] = useState(null);
  const [NFTcontractAddress, setNFTcontractAddress] = useState(null);
  const [FTcontractAddress, setFTcontractAddress] = useState(null);

  const [minting, setMinting] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (CONTRACTS[selectedChain.contract_name]) {
        const WebaversecontractAddress = CONTRACTS[selectedChain.contract_name].Webaverse;
        const NFTcontractAddress = CONTRACTS[selectedChain.contract_name].NFT;
        const FTcontractAddress = CONTRACTS[selectedChain.contract_name].FT;
        setWebaversecontractAddress(WebaversecontractAddress);
        setNFTcontractAddress(NFTcontractAddress);
        setFTcontractAddress(FTcontractAddress);
      } else {
        throw new Error('unsupported chain');
      }
    } catch (error) {
      console.warn('tried to use contract for unsupported chain');
    }
  }, [selectedChain]);

  async function getSigner() {
    var provider = new ethers.providers.Web3Provider(window.ethereum);
    return provider.getSigner(currentAccount);
  }

  const getContract = async () => { // NFTcontract
    const simpleRpcProvider = new ethers.providers.StaticJsonRpcProvider(selectedChain.rpcUrls[0]);
    const NFTcontractAddress = CONTRACTS[selectedChain.contract_name].NFT;
    const contract = new ethers.Contract(NFTcontractAddress, NFTABI, simpleRpcProvider);
    return contract;
  };

  async function mintNFT(currentApp, afterminting = () => {}) {
    setMinting(true);
    setError('');
    try {
      const signer = await getSigner();
      const Webaversecontract = new ethers.Contract(
        WebaversecontractAddress,
        WebaverseABI,
        signer,
      );
      const FTcontract = new ethers.Contract(FTcontractAddress, FTABI, signer);

      const Bigmintfee = await Webaversecontract.mintFee();
      const mintfee = BigNumber.from(Bigmintfee).toNumber();
      const Bigsilkbalance = await FTcontract.balanceOf(currentAccount);
      const silkbalance = BigNumber.from(Bigsilkbalance).toNumber();

      if (mintfee > 0) {
        // check if silk token balance is enough to mint the NFT
        if(silkbalance < mintfee) {
          console.warn('your silk token balance is not enough to mint NFT');
          setError('Mint Failed');
        } else {
          // webaverse side chain mintfee != 0
          const FTapprovetx = await FTcontract.approve(
            WebaversecontractAddress,
            mintfee,
          ); // mintfee = 10 default
          const FTapproveres = await FTapprovetx.wait();
          if (FTapproveres.transactionHash) {
            try {
              const minttx = await Webaversecontract.mintCreatorNFT(
                currentAccount,
                1,
                currentApp.contentId,
                '0x',
              );
              const res = await minttx.wait();
              if (res.transactionHash) {
                afterminting();
              }
            } catch (err) {
              console.warn('minting to webaverse contract failed');
              setError('Mint Failed');
            }
          }    
        }
      } else {
        // mintfee = 0 for Polygon not webaverse sidechain
        try {
          const minttx = await Webaversecontract.mintCreatorNFT(
            currentAccount,
            1,
            currentApp.contentId,
            '0x',
          );
          const res = await minttx.wait();
          if (res.transactionHash) {
            afterminting();
          }
        } catch (err) {
          console.log('error', err)
          console.warn('minting to webaverse contract failed');
          setError('Mint Failed');
        }
      }
      setMinting(false);
    } catch (err) {
      console.log('error', err)
      console.warn('minting to webaverse contract failed');
      setError('Mint Failed');
      setMinting(false);
    }
  }

  async function mintfromVoucher(app, afterminting = f => f) { // server drop
    setMinting(true);
    setError('');

    if (app.type === 'major') {
      try {
        const signer = await getSigner();
        const webaverseContract = new ethers.Contract(
          WebaversecontractAddress,
          WebaverseABI,
            signer
        );
        const FTcontract = new ethers.Contract(FTcontractAddress, FTABI, signer);

        const bigMintFee = await webaverseContract.mintFee();
        const mintfee = BigNumber.from(bigMintFee).toNumber();
        const Bigsilkbalance = await FTcontract.balanceOf(currentAccount);
        const silkbalance = BigNumber.from(Bigsilkbalance).toNumber();

        if (mintfee > 0) {

        // check if silk token balance is enough to mint the NFT
        if(silkbalance < mintfee) {
          console.warn('your silk token balance is not enough to mint NFT');
          setError('Mint Failed');
        } else {
          // webaverse side chain mintfee != 0
          const FTapprovetx = await FTcontract.approve(
            WebaversecontractAddress,
            mintfee
          ); // mintfee = 10 default
          const FTapproveres = await FTapprovetx.wait();
          if (FTapproveres.transactionHash) {
            if(app.serverDrop === true) {
              try {
                const claimtx = await webaverseContract.claimServerDropNFT(
                  currentAccount,
                  '0x',
                  app.voucher
                );
                const res = await claimtx.wait();
                if (res.transactionHash) {
                  afterminting();
                }
              } catch (err) {
                console.log("error", err)
                console.warn('NFT minting to webaverse contract failed');
                setError('NFT Mint Failed');
              }
            } else {
              try {
                const minttx = await webaverseContract.claimUserDropNFT(
                  currentAccount,
                  app.voucher
                )
                const res = await minttx.wait();
                if (res.transactionHash) {
                  afterminting();
                }
              } catch (err) {
                console.warn('NFT claiming to webaverse contract failed');
                setError('NFT Mint Failed');
              }
            }
          }
        }
        } else {
          if (app.serverDrop === true) {
            try {
              const claimtx = await webaverseContract.claimServerDropNFT(
                currentAccount,
                '0x',
                app.voucher
              );
              const res = await claimtx.wait();
              if (res.transactionHash) {
                afterminting();
              }
            } catch (err) {
              console.log("error", err)
              console.warn('NFT minting to webaverse contract failed');
              setError('NFT Mint Failed');
            }
          } else {
            try {
              const minttx = await webaverseContract.claimUserDropNFT(
                currentAccount,
                app.voucher
              );
              const res = await minttx.wait();
              if (res.transactionHash) {
                afterminting();
              }
            } catch (err) {
              console.log("error", err)
              console.warn('NFT claiming to webaverse contract failed');
              setError('NFT Mint Failed');
            }
          }
        }
        setMinting(false);
      } catch (err) {
        console.log("err", err)
        console.warn('NFT minting to webaverse contract failed');
        setError('NFT Mint Failed');
        setMinting(false);
      }
    }
    if (app.type === 'minor') {
      try {
        const signer = await getSigner();
        const webaverseContract = new ethers.Contract(
          WebaversecontractAddress,
          WebaverseABI,
            signer
        );

        if (app.serverDrop === true) {
          try {
            const minttx = await webaverseContract.claimServerDropSilk(
              currentAccount,
              app.voucher,
            );
            const res = await minttx.wait();
            if (res.transactionHash) {
              afterminting();
            }
          } catch (err) {
            console.warn('FT minting to webaverse contract failed');
            setError('Mint Failed');
          }
        } else {
          try {
            const minttx = await webaverseContract.claimUserDropSilk(
              currentAccount,
              app.voucher
            );
            const res = await minttx.wait();
            if (res.transactionHash) {
              afterminting();
            }
          } catch (err) {
            console.warn('FT claiming to webaverse contract failed');
            setError('Mint Failed');
          }
        }
        setMinting(false);
      } catch (err) {
        console.warn('FT minting to webaverse contract failed');
        setError('FT Failed');
        setMinting(false);
      }
    }
  }

  async function totalSupply() {
    const contract = await getContract();
    const totalSupply = await contract.currentTokenId();
    return BigNumber.from(totalSupply).toNumber();
  }

  async function getTokenIdsOf() {
    const contract = await getContract();
    const tokenData = await contract.getTokenIdsByOwner(currentAccount);
    const tokenCount = BigNumber.from(tokenData[1]).toNumber();
    const tokenIds = [...Array(tokenCount)].map((_, index) => BigNumber.from(tokenData[0][index]).toNumber());
    return tokenIds;
  }

  async function getToken(tokenId) {
    const contract = await getContract();
    if (contract) {
      const contentURL = await contract.getTokenContentURL(tokenId);
      return contentURL;
    } else {
      return "";
    }
  }

  async function getTokens() {
    const tokenIdsOf = await getTokenIdsOf();
    return await Promise.all(
      tokenIdsOf.map(async tokenId => {
        const url = await getToken(tokenId);

        return {
          tokenId,
          url
        };
      }),
    );
  }

  async function getOTtokens(walletAddress = currentAccount) {
    const network = "ETHEREUM"
    const OTtoken = await fetch(`https://serverless-backend-blue.vercel.app/api/getOpenSeaNFTCollection?walletAddress=${walletAddress}&collectionAddress=${OTCollectionAddress}&network=${network}`,
    {
            method: 'get',
            redirect: 'follow'
    }).then(response => response.json())
    return OTtoken;
  }

  return {
    totalSupply,
    minting,
    mintNFT,
    getContract,
    showWallet,
    setShowWallet,
    getToken,
    getTokens,
    mintfromVoucher,
    getTokenIdsOf,
    error,
    setError,
    WebaversecontractAddress,
    getOTtokens
  };
}