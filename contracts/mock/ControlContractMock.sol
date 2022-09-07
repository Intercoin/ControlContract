// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

import "../ControlContract.sol";
import "@artman325/community/contracts/interfaces/ICommunity.sol";

contract ControlContractMock is ControlContract {
   
    function getGroupTimeoutActivity() public view returns(uint256) {
        return groupTimeoutActivity;
    }
    
    // function getNow() public view returns(uint256) {
    //     return block.timestamp;
    // }
    // function getCurrentGroupIndex() public view returns(uint256) {
    //     return currentGroupIndex;
    // }
    
    // function getEndorseAllowedMock(address tokenAddr, string memory method, address sender) public view  returns(uint256[] memory list) {
      
    //   for (uint256 i=0; i< endorseAllowed[keccak256(abi.encodePacked(tokenAddr,method))].length(); i++) {
            
    //             list[list.length] = endorseAllowed[keccak256(abi.encodePacked(tokenAddr,method))].at(i);
            
    //     }
    // }
  
    // function getEndorsedRolesMock(address tokenAddr, string memory method, address sender) public view  returns(string[] memory list) {
    //     string[] memory roles = ICommunity(communityAddress).getRoles(sender);

    //     for (uint256 i=0; i< roles.length; i++) {
            
    //         if (endorseAllowed[keccak256(abi.encodePacked(tokenAddr,method))].contains(roleIDs[roles[i]])) {
    //             list[list.length] = roles[i];
    //         }
    //     }
    // }

    uint256 uint256Var;

    function setInsideVar(uint256 i) 
        public 
    {
        require(msg.sender == address(this), "able to call from itself only" );

        uint256Var = i;
    }

    function getInsideVar(
    ) 
        public 
        view 
        returns(uint256 i)
    {
        return uint256Var;
    }

    function transferERC20(address token, address to, uint256 amount) public {
        IERC20Upgradeable(token).transfer(to, amount);
    }
    function transferERC1155(address token, address to, uint256 id, uint256 amount) public {
        IERC1155Upgradeable(token).safeTransferFrom(address(this), to, id, amount, ""); 
    }
    function transferERC777(address token, address to, uint256 amount) public {
        IERC20Upgradeable(token).transfer(to, amount);
    }
    function transferERC721(address token, address to, uint256 amount) public {
        IERC721Upgradeable(token).safeTransferFrom(address(this), to, amount); 
    }
    
}