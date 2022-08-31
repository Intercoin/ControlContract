// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
contract MockERC777 is ERC777 {
    constructor(string memory name_, string memory symbol_) ERC777(name_, symbol_, new address[](0)) {
    }
    function mint(address account, uint256 amount) public {
        _mint(account, amount, "", "", true);
    }
}