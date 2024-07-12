# DAO Voting System

A decentralized autonomous organization (DAO) voting system built on the Solana blockchain using Anchor framework. This system allows users to create proposals, vote on them, and receive rewards for participation.

## Features

- Create and manage proposals
- Vote on active proposals
- Reward system for voting participation
- Close proposals

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Rust and Cargo (latest stable version)
- Solana CLI tools (v1.14.0 or later)
- Anchor CLI (v0.29.0 or later)
- Node.js (v14 or later)
- Yarn or npm

## Installation

1. Clone the repository:

## Installation

1. Clone the repository:
    ```sh
    git clone git@github.com:0xCipherCoder/dao-voting-system.git
    cd dao-voting-system
    ```

2. Install dependencies:
    ```sh
    npm install
    anchor build
    ```

3. Deploy the programs to Solana Local Tesnet:
    ```sh
    anchor deploy
    ```

## Usage 

### Test the overall functionality with test cases:
    ```sh
    anchor test
    ```
## Testing

    ```sh
    anchor test
    ```

## Test Report 

    ```sh
    anchor test
    ```

### Test Output

    ```sh
     nchor test
    Finished release [optimized] target(s) in 0.10s

Found a 'test' script in the Anchor.toml. Running it as a test suite!

Running test suite: "/home/pradip/Cipher/OpenSource/dao_voting_system/Anchor.toml"

yarn run v1.22.19
warning package.json: No license field
warning package.json: "dependencies" has dependency "chai" with range "^4.3.7" that collides with a dependency in "devDependencies" of the same name with version "^4.3.4"
warning ../../../package.json: No license field
$ /home/pradip/Cipher/OpenSource/dao_voting_system/node_modules/.bin/ts-mocha -p ./tsconfig.json -t 1000000 'tests/**/*.ts'
(node:662352) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)


  dao-voting-system
    ✔ Creates a proposal (435ms)
    ✔ Allows users to vote and rewards them (1729ms)
    ✔ Closes the proposal (438ms)
    ✔ Prevents voting on a closed proposal


  4 passing (4s)

Done in 4.75s.
    ```

### Prerequisites

Ensure you have a local Solana cluster running:
```sh
solana-test-validator

