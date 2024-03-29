// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @dev Extension of {ERC20} that allows token holders to destroy both their own
 * tokens and those that they have an allowance for, in a way that can be
 * recognized off-chain (via event analysis).
 */
contract ERC20Mintable is ERC20Upgradeable, OwnableUpgradeable {
    
    /**
     * @param name Token name
     * @param symbol Token symbol
     * 
     */
    function init(
        string memory name, 
        string memory symbol
    ) 
        public 
        initializer 
    {
        __Ownable_init();
        __ERC20_init_unchained(name, symbol);
    }
    
    /**
     * @dev Creates `amount` tokens and send to account.
     *
     * See {ERC20-_mint}.
     */
    function mint(address account, uint256 amount) public virtual {
        _mint(account, amount);
    }
    
}