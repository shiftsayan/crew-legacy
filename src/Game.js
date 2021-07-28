import shuffle from "lodash/shuffle";

function Setup(ctx, setupData) {
    const G = {}

    var cards = []
    for (var num = 1; num <= 9; num++)
        for (var suite of ['blue', 'red', 'green', 'yellow'])
            cards.push({'num': num, 'suite': suite})
    for (num = 1; num <= 4; num++)
        cards.push({'num': num, 'suite': 'black'})
    G.cards = shuffle(cards)

    G.mission = (setupData && setupData.mission) || 'planetx_1'
    G.reception_dead_spot = false

    G.numGoals = 2 // TODO
    
    G.players = {}
    for (var i = 0; i < ctx.numPlayers; i++)
        G.players[i.toString()] = { 
            hand: [], 
            canCommunicate: false,
            communication: null,
        }
    
    G.goals = []

    G.currentTrick = []
    G.allTricks = []

    return G
}

function DealCards(G, ctx) {
    var player = 0
    while (G.cards.length !== 0) {
        var card = G.cards.pop()
        if (card.suite === 'black' && card.num === 4)
            G.commander = player
        G.players[player.toString()].hand.push(card)
        player = (player + 1) % ctx.numPlayers
    }
}

function DealGoals(G, ctx) {
    var goals = []
    for (var num = 1; num <= 9; num++)
        for (var suite of ['blue', 'red', 'green', 'yellow'])
            goals.push({'num': num, 'suite': suite, 'player': null}) // TODO
    goals = shuffle(goals)
    
    for (var i = 0; i < G.numGoals; i++) {
        G.goals.push(goals[i])
    }
}

function ChooseGoals(G, ctx, idx) {
    if (G.goals[idx].player !== null)
        throw new Error("Goal Already Claimed")
    
    G.goals[idx].player = ctx.currentPlayer
    // TODO: If only 1 goal remains, auto-assign it.
    ctx.events.endTurn()
}

function Communicate(G, ctx, isCommunicating, card, order) {
    if (!isCommunicating)
        return;
    
    if (!G.player[ctx.currentPlayer].canCommunicate) {
        if (G.player.communication !== null)
            throw new Error("Player Already Communicated")
        else
            throw new Error("Player Not Allowed To Communicate")
    }

    if (card.suite === 'black')
        throw new Error("Cannot Communicate Rockets") // TODO
    
    G.player[ctx.currentPlayer].canCommunicate = false
    G.player.communication = {'card': card, 'order': G.reception_dead_spot ? null : order}
}

function PlayTrick(G, ctx, card) {
    if (!G.players[ctx.currentPlayer].hand.includes(card))
        throw new Error("Card Not Possessed")
    
    if (G.currentTrick !== [] // this is not a new trick
        && G.currentTrick[0].suite !== card.suite // and the suite does not match the trick suit
        && !G.players[ctx.currentPlayer].hand.every(_card => _card.suite !== card.suite)) // even though the player has it
        throw new Error("Must Play Card of Same Suite When Possible")

    G.players[ctx.currentPlayer].hand.splice(G.players[ctx.currentPlayer].hand.indexOf(card), 1)
    G.currentTrick.push({'player': ctx.currentPlayer, 'card': card})

    ctx.events.endTurn()
}

function EndTrick(G, ctx) {
    var best = null
    var bestNum = null
    var bestSuite = null
    for (play of G.currentTrick) {
        if ((play.card.suite === bestSuite && play.card.num > bestNum) || play.card.suite === 'black') {
            best = play.player
            bestNum = play.card.num
            bestSuite = play.card.suite
        }
    }
    
    G.allTricks.push({'winner': best, 'trick': G.currentTrick}) // TODO: Validate win condition
    G.currentTrick = []
}

export const Crew = {
    minPlayers: 3,
    maxPlayers: 5,

    setup: Setup,

    phases: {
        DealCards: {
            start: true,
            onBegin: DealCards,
            endIf: G => (G.cards.length <= 0),
            next: 'DealGoals',
        },

        DealGoals: {
            onBegin: DealGoals,
            endIf: G => (G.goals.length === G.numGoals),
            next: 'ChooseGoals',
        },

        ChooseGoals: {
            moves: { ChooseGoals },
            endIf: G => (G.goals.every(goal => goal.player !== null)),
            next: 'Communicate',
        },
        
        Communicate: {
            moves: { Communicate },
            next: 'PlayTrick',
        },

        PlayTrick: {
            moves: { PlayTrick },
            onEnd: EndTrick,
        },
    },
};