import React, { useEffect, useState } from 'react';
import {
  Multicall,
  ContractCallResults,
  ContractCallContext,
} from 'ethereum-multicall';
import { ethers } from 'ethers';
import { BigNumber } from "bignumber.js";
import { isNumberObject } from 'util/types';
import axios from 'axios';


const erc20Abi = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

interface Token {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
}

const App = () => {
  const [tokenData, setTokenData] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [tokenList, setTokenList] = useState<Token[]>([]);
  const userAddress = '0xf977814e90da44bfa03b6295a0616a897441acec';

  useEffect(() => {
    const fetchTokenData = async () => {
      const multicall = new Multicall({
        nodeUrl: 'https://polygon-rpc.com',
        tryAggregate: true,
      });

      // Fetch the token list from Uniswap
      const response = await axios.get('https://gateway.ipfs.io/ipns/tokens.uniswap.org');
      const tokenList = response.data.tokens.filter((token: { chainId: number }) => token.chainId === 137);

      // Extract the token addresses
      const tokenAddresses = tokenList.map((token: { address: string }) => token.address);

      const contractCallContext: ContractCallContext[] = tokenAddresses.map(
        (address: string, index: number) => {
          return {
            reference: `token-${index}`,
            contractAddress: address,
            abi: erc20Abi,
            calls: [
              { reference: 'totalSupply', methodName: 'totalSupply', methodParameters: [] },
              {
                reference: 'balanceOf',
                methodName: 'balanceOf',
                methodParameters: [userAddress],
              }
            ],
          };
        },
      );

      const results: ContractCallResults = await multicall.call(
        contractCallContext,
      );

      const tokens = tokenAddresses.map((address: string, index: number) => {
        const result = results.results[`token-${index}`];
        const callsReturnContext = result.callsReturnContext;

        console.log('callsReturnContext:', callsReturnContext);

        return {
          address,

          totalSupply: BigNumber(callsReturnContext[0].returnValues[0].hex)
            .toString(10),
          balance: BigNumber(callsReturnContext[1].returnValues[0].hex)
            .toString(10),
        };
      });

      setTokenData(tokens);
    };

    fetchTokenData();
  }, []);



  function handleSort(key: string) {
    // If the user clicked on the same key as the current sort key,
    // toggle the sort order. Otherwise, set the new sort key and
    // reset the sort order to ascending.
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  function sortTokens(tokens: any[]) {
    // If no sort key is set, return the unsorted array.
    if (!sortKey) {
      return tokens;
    }

    // Sort the tokens array by the specified key and sort order.
    const sorted = tokens.slice().sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) {
        return 0;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });

    return sorted;
  }

  const sortedTokens = sortTokens(tokenData);
  const sortedTokensWithBalance = sortedTokens.filter(token => parseFloat(token.balance) > 0);

  return (
    <div>
      <h1>Token Balances for </h1>
      <p><a href={`https://polygonscan.com/address/${userAddress}`} target="_blank">{userAddress}</a></p>      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>Token</th>
            <th onClick={() => handleSort('symbol')}>Symbol</th>
            <th onClick={() => handleSort('decimals')}>Decimals</th>
            <th onClick={() => handleSort('totalSupply')}>Total</th>
            <th onClick={() => handleSort('balance')}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {sortedTokensWithBalance.map((token, index) => (
            <tr key={index}>
              <td>{token.name}</td>
              <td>{token.symbol}</td>
              <td>{token.decimals}</td>
              <td>{token.totalSupply.toString()}</td>
              <td>{token.balance.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;