# ERC20Mintable

contracts/ERC20Mintable.sol

> Details: Extension of {ERC20} that allows token holders to destroy both their own tokens and those that they have an allowance for, in a way that can be recognized off-chain (via event analysis).

# Overview

Once installed will be use methods:

| **method name** | **called by** | **description** |
|-|-|-|
|<a href="#allowance">allowance</a>|everyone||
|<a href="#approve">approve</a>|everyone||
|<a href="#balanceof">balanceOf</a>|everyone||
|<a href="#decimals">decimals</a>|everyone||
|<a href="#decreaseallowance">decreaseAllowance</a>|everyone||
|<a href="#increaseallowance">increaseAllowance</a>|everyone||
|<a href="#init">init</a>|everyone||
|<a href="#mint">mint</a>|everyone||
|<a href="#name">name</a>|everyone||
|<a href="#owner">owner</a>|everyone||
|<a href="#renounceownership">renounceOwnership</a>|everyone||
|<a href="#symbol">symbol</a>|everyone||
|<a href="#totalsupply">totalSupply</a>|everyone||
|<a href="#transfer">transfer</a>|everyone||
|<a href="#transferfrom">transferFrom</a>|everyone||
|<a href="#transferownership">transferOwnership</a>|everyone||
## *Events*
### Approval

Arguments

| **name** | **type** | **description** |
|-|-|-|
| owner | address | indexed |
| spender | address | indexed |
| value | uint256 | not indexed |



### OwnershipTransferred

Arguments

| **name** | **type** | **description** |
|-|-|-|
| previousOwner | address | indexed |
| newOwner | address | indexed |



### Transfer

Arguments

| **name** | **type** | **description** |
|-|-|-|
| from | address | indexed |
| to | address | indexed |
| value | uint256 | not indexed |



## *Functions*
### allowance

> Details: See {IERC20-allowance}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| owner | address |  |
| spender | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### approve

> Details: See {IERC20-approve}. NOTE: If `amount` is the maximum `uint256`, the allowance is not updated on `transferFrom`. This is semantically equivalent to an infinite approval. Requirements: - `spender` cannot be the zero address.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| spender | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### balanceOf

> Details: See {IERC20-balanceOf}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### decimals

> Details: Returns the number of decimals used to get its user representation. For example, if `decimals` equals `2`, a balance of `505` tokens should be displayed to a user as `5.05` (`505 / 10 ** 2`). Tokens usually opt for a value of 18, imitating the relationship between Ether and Wei. This is the value {ERC20} uses, unless this function is overridden; NOTE: This information is only used for _display_ purposes: it in no way affects any of the arithmetic of the contract, including {IERC20-balanceOf} and {IERC20-transfer}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint8 |  |



### decreaseAllowance

> Details: Atomically decreases the allowance granted to `spender` by the caller. This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}. Emits an {Approval} event indicating the updated allowance. Requirements: - `spender` cannot be the zero address. - `spender` must have allowance for the caller of at least `subtractedValue`.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| spender | address |  |
| subtractedValue | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### increaseAllowance

> Details: Atomically increases the allowance granted to `spender` by the caller. This is an alternative to {approve} that can be used as a mitigation for problems described in {IERC20-approve}. Emits an {Approval} event indicating the updated allowance. Requirements: - `spender` cannot be the zero address.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| spender | address |  |
| addedValue | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### init

Arguments

| **name** | **type** | **description** |
|-|-|-|
| name | string | Token name |
| symbol | string | Token symbol  |



### mint

> Details: Creates `amount` tokens and send to account. See {ERC20-_mint}.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| account | address |  |
| amount | uint256 |  |



### name

> Details: Returns the name of the token.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | string |  |



### owner

> Details: Returns the address of the current owner.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | address |  |



### renounceOwnership

> Details: Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.



### symbol

> Details: Returns the symbol of the token, usually a shorter version of the name.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | string |  |



### totalSupply

> Details: See {IERC20-totalSupply}.

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | uint256 |  |



### transfer

> Details: See {IERC20-transfer}. Requirements: - `to` cannot be the zero address. - the caller must have a balance of at least `amount`.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| to | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### transferFrom

> Details: See {IERC20-transferFrom}. Emits an {Approval} event indicating the updated allowance. This is not required by the EIP. See the note at the beginning of {ERC20}. NOTE: Does not update the allowance if the current allowance is the maximum `uint256`. Requirements: - `from` and `to` cannot be the zero address. - `from` must have a balance of at least `amount`. - the caller must have allowance for ``from``'s tokens of at least `amount`.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| from | address |  |
| to | address |  |
| amount | uint256 |  |

Outputs

| **name** | **type** | **description** |
|-|-|-|
| -/- | bool |  |



### transferOwnership

> Details: Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Arguments

| **name** | **type** | **description** |
|-|-|-|
| newOwner | address |  |


