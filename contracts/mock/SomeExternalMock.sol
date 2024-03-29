// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

contract SomeExternalMock {
    uint256 incrementCount;
    
    function counter() public {
        incrementCount++;
    }
    
    function viewCounter() public view returns(uint256) {
        return incrementCount;
    }
    
    function returnFuncSignatureHexadecimalString() public pure returns(string memory) {
        //abi.encodePacked(bytes4(keccak256(abi.encodePacked('counter',"()"))));
        return "61bc221a";
    }
    
    function getNumber(address addr, uint256 blockNumber) public view returns(uint256 number) {
        bytes32 blockHash = blockhash(blockNumber);
            
        number = (uint256(keccak256(abi.encodePacked(blockHash, addr))) % 1000000);
        
    }
    function getHash(uint256 blockNumber) public view returns(bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
        
        
    }
    
}
