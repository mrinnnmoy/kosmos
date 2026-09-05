# Kosmos Contracts

This directory contains the Solidity smart contracts for Kosmos and uses [Foundry](https://book.getfoundry.sh/) for development, compilation, and testing.

## Prerequisites

Install:

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git

Check that Foundry is available:

```bash
forge --version
```

## Install Dependencies

The Solidity dependencies are intentionally **not committed** to this repository.

From the `contracts/` directory, install them with:

```bash
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
```

This creates the local `lib/` directory.

## Build

After installing the dependencies:

```bash
forge build
```

## Test

Run the contract tests with:

```bash
forge test
```

For more verbose output:

```bash
forge test -vv
```

## Gas Report

```bash
forge test --gas-report
```

## Dependency Policy

The `lib/` directory is intentionally excluded from Git.

Dependencies should be installed locally using Foundry after cloning the repository. This keeps the repository lightweight and ensures dependencies are restored through their declared package sources rather than storing third-party source code in the Kosmos repository.

## Project Structure

```text
contracts/
├── foundry.toml
├── foundry.lock
├── src/
├── test/
├── script/
└── README.md
```

After installing dependencies locally:

```text
contracts/
├── foundry.toml
├── foundry.lock
├── lib/
│   ├── forge-std/
│   └── openzeppelin-contracts/
├── src/
├── test/
├── script/
└── README.md
```
