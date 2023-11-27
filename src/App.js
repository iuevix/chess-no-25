import { useState, useEffect, useContext } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Theme, getImage } from './Theme';
import * as gameLogic from './gameLogic.js';
import styles from './App.module.css';
import { DebugRunContext } from './DebugRunContext';

function Square({ value, onSquareClick, selectedPiece, index, theme, squares, testid }) {
	const isDark = ((Math.floor(index / 8) % 2) !== (index % 2));
	const color = isDark ? theme.square.darkColor : theme.square.lightColor;
	const style = {
		backgroundColor: color[0]
	};
	
	let bcIndexSteps = [];
	let bcIndex = null;
	if (selectedPiece) {
		bcIndexSteps.push([Number(selectedPiece === index), 'x: 0 or 1: check if {{index}} piece is selected']);
		bcIndexSteps.push([Boolean(selectedPiece), 'a: boolean: check if any piece is selected']);
		bcIndexSteps.push([bcIndexSteps[1][0] ? gameLogic.moveCanBePlayed(selectedPiece, index, squares) : false, 'b: if a, then check if piece can be moved to {{index}}, else false']);
		bcIndexSteps.push([bcIndexSteps[2][0] * 2, 'y: b * 2']);
		bcIndexSteps.push([bcIndexSteps[0][0] + bcIndexSteps[3][0], 'bcIndex: x + y']);
		bcIndex = bcIndexSteps[bcIndexSteps.length - 1][0];
		style.backgroundColor = color[bcIndex];
	}

	console.dlog(useContext(DebugRunContext), 4, 'render square log', {
		value: value,
		onSquareClick: onSquareClick,
		selectedPiece: selectedPiece,
		index: index,
		theme: theme,
		global: global,
		setGlobal: (n, v) => global[n] = v,
		squares: squares,
		style: style,
		bcIndex: bcIndex,
		bcIndexSteps: bcIndexSteps,
		colors: color
	});
	
	value = global.sqValue ? eval(global.sqValue) : getImage(value);

	return <button className={`${styles.unselectable} ${styles.square}`} onClick={onSquareClick} style={style} data-testid={testid}>{value}</button>;
}

function BoardRow({ index, onSquareClick, squares, selectedPiece, theme }) {
	const rowIndex = index;
	index *= 8;
	return (
		<div className={styles.boardRow}>
			<Square value={squares[index+0]} onSquareClick={() => onSquareClick(index+0)} selectedPiece={selectedPiece} index={index+0} theme={theme} squares={squares} data-testid={`0/${rowIndex}`} />
			<Square value={squares[index+1]} onSquareClick={() => onSquareClick(index+1)} selectedPiece={selectedPiece} index={index+1} theme={theme} squares={squares} data-testid={`1/${rowIndex}`} />
			<Square value={squares[index+2]} onSquareClick={() => onSquareClick(index+2)} selectedPiece={selectedPiece} index={index+2} theme={theme} squares={squares} data-testid={`2/${rowIndex}`} />
			<Square value={squares[index+3]} onSquareClick={() => onSquareClick(index+3)} selectedPiece={selectedPiece} index={index+3} theme={theme} squares={squares} data-testid={`3/${rowIndex}`} />
			<Square value={squares[index+4]} onSquareClick={() => onSquareClick(index+4)} selectedPiece={selectedPiece} index={index+4} theme={theme} squares={squares} data-testid={`4/${rowIndex}`} />
			<Square value={squares[index+5]} onSquareClick={() => onSquareClick(index+5)} selectedPiece={selectedPiece} index={index+5} theme={theme} squares={squares} data-testid={`5/${rowIndex}`} />
			<Square value={squares[index+6]} onSquareClick={() => onSquareClick(index+6)} selectedPiece={selectedPiece} index={index+6} theme={theme} squares={squares} data-testid={`6/${rowIndex}`} />
			<Square value={squares[index+7]} onSquareClick={() => onSquareClick(index+7)} selectedPiece={selectedPiece} index={index+7} theme={theme} squares={squares} data-testid={`7/${rowIndex}`} />
		</div>
	);
}

function Board({ theme, data, onPlay, onRevert }) {
	const logrun = useContext(DebugRunContext);
	console.dlog(logrun, 3, 'render data write', data);

	const [selectedPiece, setSelectedPiece] = useState(null);
	const [lightIsNext, setLightIsNext] = useState(true);
	const squares = data.history[data.currentMove].squares.slice();
	
	function handleClick(index) {
		const nextSquares = squares.slice();
		const logData = {
			selectedPiece: selectedPiece ? { x: selectedPiece % 8, y: Math.floor(selectedPiece / 8) } : null,
			position: index ? { x: index % 8, y: Math.floor(index / 8) } : null,
			selectedValue: selectedPiece ? squares[selectedPiece] : null,
			value: index ? squares[index] : null,
			raw: {
				index: index,
				squares: squares,
				selectedPiece: selectedPiece
			},
			conditions: {
				_0_unselect: Boolean(selectedPiece === index),
				_1_select: Boolean(selectedPiece === null && squares[index] !== null),
				_2_move: Boolean(squares[index] !== null)
			},
			chessData: data
		};
		logData.conditions._1_select &= !logData.conditions._0_unselect;
		logData.conditions._2_move &= !logData.conditions._1_select;
		console.dlog(logrun, 1, "board click update", logData);

		const toMove = (data.history.length % 2) ? 'light' : 'dark';
		console.dlog(logrun, 2, 'toMove log', toMove);

		if (selectedPiece === index) {
			console.dlog(logrun, 2, "unselecting piece");
			setSelectedPiece(null);
		}
		else if (selectedPiece === null && squares[index] !== null) {
			console.dlog(logrun, 2, "selecting piece");
			if (squares[index].player !== toMove) {
				console.dlog(logrun, 1, 'cancelling selection, bad player');
				return;
			}
			setSelectedPiece(index);
		}
		else if (selectedPiece !== null) {
			const [canBeMoved, doMoveExtra] = gameLogic.canBeMovedExtra(selectedPiece, index, squares);
			if (canBeMoved) {
				console.dlog(logrun, 2, "moving piece");
				nextSquares[selectedPiece] = null;
				nextSquares[index] = squares[selectedPiece];
				doMoveExtra((i, v) => nextSquares[i] = v);
				let king;
				for (let i = 0; i < squares.length; i++)
					if (squares[i] && squares[i].fullName === `${toMove} king`) {
						king = i;
						break;
					}
				console.dlog(logrun, 2, 'king log', gameLogic.index2pos(king));
				if (gameLogic.isKingAttacked(king, nextSquares)) {
					console.dlog(logrun, 2, 'cancelling move, king is attacked');
					return;
				}
				onPlay(selectedPiece, index, nextSquares);
				setSelectedPiece(null);
			}
		}
	}

	global.chess.squares = squares;
	global.chess.history = data.history;
	global.chess.advanced = data;

	return (
		<div className={styles.board} style={theme.board.style}>
			<BoardRow index='0' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='1' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='2' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='3' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='4' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='5' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='6' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
			<BoardRow index='7' onSquareClick={handleClick} squares={squares} selectedPiece={selectedPiece} theme={theme} />
		</div>
	);
}

function Game({ theme, data }) {
	const logrun = useContext(DebugRunContext);
	const reRender = useState(0)[1];
	const [promoting, setPromoting] = useState(null);

	function handlePlay(from, to, nextSquares, overwrite) {
		for (let i = 0; i < nextSquares.length; i++) {
			console.dlog(logrun, 4, `(standard) promotion test testing piece at ${i}`, nextSquares[i]);
			if (nextSquares[i] && ((i < 8 && nextSquares[i].fullName === 'light pawn') || (i >= 56 && nextSquares[i].fullName === 'dark pawn'))) {
				console.dlog(logrun, 1, 'promotion data write', data);
				setPromoting(i);
			}
		}
		let nextHistory;
		if (overwrite) {
			nextHistory = data.history.slice();
			nextHistory[data.currentMove] = createHistoryObject(nextSquares);
		}
		else nextHistory = [...data.history.slice(0, data.currentMove + 1), createHistoryObject(nextSquares)];
		data.setHistory(nextHistory);
		data.setCurrentMove(nextHistory.length - 1);
		reRender(Math.random());
		global.chess.squares = nextSquares;
		global.chess.history = nextHistory;
		global.chess.currentMove = data.currentMove;
	}

	function promotePiece(index, piece) {
		console.dlog(logrun, 1, `promoting pawn on ${index} to ${piece}`);
		const nextSquares = data.history[data.currentMove].slice();
		nextSquares[index] = theme.getPiece(index < 8, piece);
		handlePlay(index, index, nextSquares, true);
		setPromoting(null);
	}

	const promotions = {};
	for (const promotion of ['queen', 'rook', 'bishop', 'knight'])
		promotions[promotion] = () => promotePiece(promoting, promotion);

	function undoMove() {
		const nextHistory = data.history;
		nextHistory.pop();
		data.setHistory(nextHistory);
		data.setCurrentMove(data.currentMove - 1);
		restoreFromHistoryObject(data.history[data.currentMove]);
		reRender(Math.random());
	}

	// initialize whereCanMove (the global._gameLogic object will be created)
	useEffect(() => {
		gameLogic.whereCanMove(Array(64).fill(null), {}, 0, 0);
		console.adlog(1, 'initialized gameLogic, gameLogic internal data write', global._gameLogic);
		handlePlay(0, 0, data.history[0].squares, true);
	}, []);

	if (gameLogic.checkMate((data.history.length % 2) ? 'light' : 'dark', data.history[data.currentMove].squares)) {
		return (
			<div className={styles.game} style={theme.game.style}>
				<p><strong>It&apos;s checkmate.</strong></p>
				<p><strong><span>{(data.history.length % 2) ? 'Black' : 'White'}</span> won!</strong></p>
			</div>
		);
	}

	return (
		<div className={styles.game} style={theme.game.style}>
			<Board theme={theme} data={data} onPlay={handlePlay} onRevert={undoMove} />
			<div className={styles.unselectable}>{(data.history.length % 2) ? 'White' : 'Black'}&nbsp;to&nbsp;move</div>
			<Button className={styles.menuButton} onClick={undoMove} variant="contained" color="primary" disabled={data.history.length <= 1}>Undo</Button>
			<Dialog open={Boolean(promoting) || (promoting === 0)}>
				<DialogTitle>Promotion</DialogTitle>
				<DialogContent><DialogContentText>Please select piece:</DialogContentText></DialogContent>
				<DialogActions>
					<Button color="primary" onClick={promotions.queen}>Queen</Button>
					<Button color="primary" onClick={promotions.rook}>Rook</Button>
					<Button color="primary" onClick={promotions.bishop}>Bishop</Button>
					<Button color="primary" onClick={promotions.knight}>Knight</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
}

function App({ setupData }) {
	const theme = setupData.theme;
	const reRender = useState(0)[1];

	global.reredner = global.rr = () => {
		reRender(Math.random());
		return 're-redner trigerred';
	};
	global.sqv = (s) => {
		global.sqValue = s;
		reRender(Math.random());
		return `global.sqValue set to ${s} : re-render trigerred`;
	};

	global.ll = global.loglevel = (s) => {
		if (s) {
			global.uselog = s;
			return `global.uselog set to ${s}`;
		}
		return global.uselog;
	};

	for (let logLevel of [1, 2, 3, 4])
		global[`ll${logLevel}`] = () => global.ll(logLevel);

	global.debugLogOption = () => {
		console.log(`set debug logging:
@
	right-click on the object -> store object as global variable
	call the stored object's function loglevel (eg. temp1.loglevel), it takes one parameter, the new log level.
	log level null or any other falsy value is no debug logging (default).
@
@
@
set any global variable:
@
	right-click on the object -> store object as global variable
	call the stored object's function setGlobal (eg. temp1.setGlobal), it takes two parameters - global name (eg. sqValue) and the new value (eg. index).
@
@
@
re-render the game:
@
	right-click on the object -> store object as global variable
	call the stored object's function reRender (eg. temp1.reRender), it does not take parameters.
@
@
@`, {
			loglevel: (p) => global.uselog = p,
			setGlobal: (n, v) => global[n] = v,
			reRender: () => reRender(Math.random())
		});
	}

	return (
		<HelmetProvider>
			<div className={styles.App} style={theme.style} data-testid="app-div">
				<Helmet>
					<title>Chess No. 25</title>
				</Helmet>
				<h1 className={styles.unselectable}>Chess No. 25</h1>
				<Game theme={theme} data={setupData} />
			</div>
		</HelmetProvider>
	);
}

function DefaultApp() {
	return <App setupData={new setupData(Theme('default', useContext(DebugRunContext)))} />;
}

function createHistoryObject(squares) {
	console.adlog(2, 'creating history object, squares:', squares, '_gameLogic:', global._gameLogic);
	return { squares: squares, set: { _gameLogic: structuredClone(global._gameLogic) } };
}

function restoreFromHistoryObject(obj) {
	console.adlog(2, 'restoring from history object:', obj);
	for (const name in obj.set) {
		console.adlog(3, `restoring historyObj[${JSON.stringify(name)}]:`, obj.set[name]);
		global[name] = obj.set[name];
	}
	return obj.squares;
}

class setupData {
	constructor(theme) {
		this.type = "chessdata";
		this.history = [Array(64).fill(null)];
		this.setHistory = (s) => this.history = s;
		this.currentMove = 0;
		this.setCurrentMove = (s) => this.currentMove = s;
		this.theme = theme;
		
		for (const color of ['light', 'dark']) {
			const row = Array(8).fill(null);
			row[0] = theme.getPiece(color, 'rook');
			row[1] = theme.getPiece(color, 'knight');
			row[2] = theme.getPiece(color, 'bishop');
			row[3] = theme.getPiece(color, 'queen');
			row[4] = theme.getPiece(color, 'king');
			row[5] = theme.getPiece(color, 'bishop');
			row[6] = theme.getPiece(color, 'knight');
			row[7] = theme.getPiece(color, 'rook');
			for (let i = 0; i < 8; i++) {
				this.history[0][(color === 'dark') ? i : (i + 56)] = row[i];
				this.history[0][(color === 'dark') ? (i + 8) : (i + 48)] = theme.getPiece(color, 'pawn');
			}
		}
	}
}

export { setupData, DefaultApp };
export default App;
