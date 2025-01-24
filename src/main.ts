
import { setup, createActor, fromPromise, assign } from "xstate";
import { readFile } from "fs/promises";
const FURHATURI = "127.0.0.1:54321"; //"192.168.1.11:54321";//"127.0.0.1:54321";
interface Message {
  role: "assistant" | "user" | "system";
  content: string;
  
} ; 

const repeat = `Since the user didn't answer , say that you didn't hear them and repeat the question.`
const init_prompt = `You will have a dialogue about some objects. Don't make any comments in the beginning of the discussion. Don't forget to be brief. When you start 
the conversation, be kind and say hello. Don't use emojis` ;

async function fhSay(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(text);
  return fetch(`http://${FURHATURI}/furhat/say?text=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}
async function fhListen() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/listen`, {
    method: "GET",
    headers: myHeaders,
  })
    .then((response) => response.body)
    .then((body) => body.getReader().read())
    .then((reader) => reader.value)
    .then((value) => JSON.parse(new TextDecoder().decode(value)).message);
}




async function newGesture() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=false`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
    name :"newGesture", //this is a copy for the big smile 
    frames:[
    {
      time:[0.32,0.64],
      persist:false,
      params:{
        //"BROW_UP_LEFT":0.7,
        "BROW_UP_RIGHT":0,
        "SMILE_OPEN":1,
        "SMILE_CLOSED":1,
        //"LOOK_DOWN_RIGHT": 1,
        //"SURPRISE":1
        }
    },
    {
      time:[0.96], 
    persist:false, 
      params:{
        reset:true
        }
    }],
  class:"furhatos.gestures.Gesture"
}),
});
}

async function ListeningCarefully() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/gesture?blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      name: "ListeningCarefully",
      frames: [
        {
          time: [3.50,3.70], 
          persist: true,
          params: {NECK_PAN : 20.0
          },
        },
        {
          time : [3.50,3.75],
          persist : true ,
          params  :{ BROW_DOWN_LEFT : 0.7 ,
                     BROW_DOWN_RIGHT : 0.7,
                     EYE_SQUINT_LEFT : 0.7,
                     EYE_SQUINT_RIGHT : 0.7
          },
        },
        {
          time: [3.80], 
          params: {
            reset: true,
          },
        },
      ],
      class: "furhatos.gestures.Gesture",
    }),
  });
}




async function fhGetUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/users`, {
    method: "GET",
    headers: myHeaders,
  })
}


async function AttendToUser() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=CLOSEST`, {
    method: "POST",
    headers: myHeaders,
    body: JSON.stringify({
      enum: "CLOSEST",
    }),
  });
}








async function fhListenTimeout(timeout=60000) {  // Default timeout is 5000 milliseconds (5 seconds)
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const controller = new AbortController();
  const signal = controller.signal;
  const fetchTimeout = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`http://${FURHATURI}/furhat/listen`, {
      method: "GET",
      headers: myHeaders,
      signal: signal
    });
    const body = await response.body;
    const reader = body.getReader();
    const { value } = await reader.read();
    const message = JSON.parse(new TextDecoder().decode(value)).message;
    clearTimeout(fetchTimeout);
    return message;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Fetch request timed out');
    }
    throw error;
  }
}



















async function fhGesture(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(
    `http://${FURHATURI}/furhat/gesture?name=${text}&blocking=true`,
    {
      method: "POST",
      headers: myHeaders,
      body: "",
    },
  );
}
async function fhAttend() {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  return fetch(`http://${FURHATURI}/furhat/attend?user=RANDOM`, {
    method: "POST",
    headers: myHeaders,
  });
}


const dmMachine = setup({
  actors: {
  detectObjectActor: fromPromise<any, null>(async () => {
  const confidenceThreshold = 0.5;
  const apiUrl = "http://127.0.0.1:5000/detect-objects";
  //const imagePath = "./transport.jpg";
  const imagePath = "./detect2.jpg"; // change the path when you want to detect other image
  const imageBuffer = await readFile(imagePath);
  const formData = new FormData();
  formData.append("image", new Blob([imageBuffer], { type: "image/jpeg" }));
  formData.append("confidence_threshold", confidenceThreshold.toString());
  //  FLASK API
  const apiResponse = await fetch(apiUrl, {
    method: "POST",
    body: formData,
  });
  if (!apiResponse.ok) {
    throw new Error("Object detection API request failed");
  }
  const detectedObjects = await apiResponse.json();
  return detectedObjects;
}),


    get_ollama_models: fromPromise<any, null>(async () => {
      return fetch("http://localhost:11434/api/tags").then((response) =>
        response.json()
      );
    }),
    LLMActor: fromPromise<any,{prompt:Message[]}>(async ({input})=> {
      const body = {
        model: "gemma2",
        messages : input.prompt,
        stream: false,
        temperature : 0.6
      };
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
  } ), 
    Attend : fromPromise<any, null>(async () => {
      return fhGetUser(); 
    }) ,
    fhNod : fromPromise<any,any>(async () => {
      return fhGesture('Nod')
    }),
    fhL: fromPromise<any, null>(async () => {
    return Promise.all([
      fhAttend(),
      fhListenTimeout()
    ])
}),
  fhSpeak: fromPromise<any, { text: string}>(async ({ input }) => {
  return Promise.all([
    fhAttend() ,
    fhSay(input.text),
  ]);
}),















ListenCarefully: fromPromise<any, null>(async () => {
  return ListeningCarefully();
}),


  
  newGesture: fromPromise<any, null>(async () => {
    return Promise.all([
      newGesture(),
      AttendToUser]);
  }),
  



  sayactor: fromPromise<any, {text: string}>(async ({input}) => {
    return Promise.all([
    AttendToUser(),
    fhSay(input.text)]);
  }),





  },
}).createMachine({
  context: ({}) => ({
    count: 0,
    messages: [],
    field : 0,
  }),
  id: "root",
  initial: "Start",
  states: {
    Start: { after: { 1000: "Next" } },
    Next: {
      invoke : {
        src : "Attend",
        onDone : {
          target : "Go",
          actions: ({ event }) => console.log(event.output),
        } ,
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },
    Go : {
      invoke: {
        src : "LLMActor",
        input : ({}) => ({ prompt: [{ role: "user", content: init_prompt }] }),
        onDone : {
          target : "Speak",
          actions : [
            assign(({context,event}) => {
              return {
                messages : [
                  ...context.messages,
                  {role : "user",
                  content : event.output.message.content,
                  }
                ]
              }
            }),
          ({context}) => console.log(context.messages)
          ]
        }
      }
    },



    Speak : {
      invoke: {
        src: "fhSpeak",
        input: ({context}) => ({text :` ${context.messages[context.messages.length -1].content} `}),
        onDone: [ 
          {target : "ListenAnswer",
          actions: ({ event }) => console.log(event.output)},
          ],
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },

  
  Recognise : {
    invoke : {
      src : "fhNod",
      onDone : {
        target : "Generate"
      }
    }
} ,

ListenAnswer: {
  invoke: {
    src: "fhL",
    onDone: [{guard :({event}) => event.output[1] === "", target : "Repeat" },
    {guard : ({event}) => event.output[1].toLowerCase().includes("bye"), target : "Fail"},

      {
        target: "DetectObject", 
        actions: [
          ({ event }) => {
            console.log('Event output:', event.output);
          },
          // Assign the output to the context
          assign(({ context, event }) => {
            return {
              messages: [
                ...context.messages,
                {
                  role: "user",
                  content: `The answer was ${event.output[1]}. Go on with the discussion. The user is interested in having a discussion about the detected objects.
              Don't make comments in the beginning of the discussion. Don't forget to be brief. Don't say that you have a list, or that the objects are listed. Don't 
              use emojis.`,
                }
              ]
            };
          }),
      
        ]
      }
    ],
    onError: {
      target: "Fail",
      actions: ({ event }) => {
        console.error('Error event:', event);
      }
    }
  }
},







  



    DetectObject: {
      invoke: {
        src: "detectObjectActor", //object detection actor here
        onDone: {
          target: "Generate",
          actions: [
            assign(({ context, event }) => {
              return {
                messages: [
                  ...context.messages,
                  {
                    role: "system",
                    content: `Detected objects: ${event.output.join(", ")}`, // List detected objects
                  },
                ],
              };
            }),
          ],
        },
        onError: {
          target: "Fail",
          actions: ({ event }) => console.error(event),
        },
      },
    },









    Repeat:{
      invoke: {
        src: "ListenCarefully",
        onDone: {
          target: "Generate",
          actions: [
            assign(({ context, event }) => {
              return {
                messages: [
                  ...context.messages,
                  {
                    role: "system",
                    content: repeat,
                  },
                ],
              };
            }),
          ],
        },
      },
    },
  

    Generate: {
      invoke: {
        src: "LLMActor",
        input: ({context}) => ({ prompt: context.messages }),
        onDone: {
          target: "Speak",
          actions: [
            assign(({ context, event }) => {
            console.log("Event Output Type:", typeof event.output);
            console.log("Event Output:", event.output);
            if (typeof event.output === "object" && event.output.hasOwnProperty("message")) {
              console.log("Output has a message property:", event.output.message);
            } else {
              console.log("Output does not have a message property.");
            }
              return {
                messages: [
                  ...context.messages,
                  {
                    role: "assistant",
                    content: event.output.message.content,
                  },
                ],
              };
            }),
          ],
        },
      },
    },
    
    










    


    









    
    
    Fail: {},
  },
});
const actor = createActor(dmMachine).start();
console.log(actor.getSnapshot().value);
actor.subscribe((snapshot) => {
  console.log(snapshot.value);
});
