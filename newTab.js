document.addEventListener("DOMContentLoaded", () => {
  const categoriesContainer = document.getElementById("categories-container");
  const tasksContainer = document.getElementById("tasks-container");
  const taskList = document.getElementById("task-list");

  // Background images
  const backgrounds = [
    "assets/original.jpg",
    "assets/img1.jpg",
    "assets/img2.jpg",
    "assets/img3.jpg",
    "assets/img4.jpg",
    "assets/img5.jpg",
    "assets/final.jpg",
  ];

  // Predefined hardcoded tasks
  const hardcodedTasks = {
    daily: [
      "Wake up",
      "Exercise",
      "Eat breakfast",
      "Plan the day",
      "Start work",
    ],
    home: [
      "Clean kitchen",
      "Do laundry",
      "Vacuum",
      "Organize shelves",
      "Water plants",
    ],
    pet: [
      "Feed pet",
      "Walk pet",
      "Play with pet",
      "Clean litter box",
      "Visit vet",
    ],
    friends: [
      "Call a friend",
      "Plan a hangout",
      "Write a letter",
      "Send a gift",
      "Catch up online",
    ],
    mind: [
      "Meditate",
      "Read a book",
      "Journal thoughts",
      "Learn something new",
      "Practice gratitude",
    ],
  };

  // Load saved state from chrome.storage.local
  chrome.storage.local.get("state", (data) => {
    if (data.state) {
      const { tasks, backgroundIndex, categoriesHidden, isFinalImage } =
        data.state;

      if (isFinalImage) {
        // If all tasks are completed, show the final image and hide categories
        document.body.style.backgroundImage = `url(${
          backgrounds[backgrounds.length - 1]
        })`;
        tasksContainer.classList.add("hidden");
        categoriesContainer.classList.add("hidden");
      } else {
        // Restore tasks, background, and categories visibility
        renderTasks(tasks, backgroundIndex);
        if (categoriesHidden) {
          categoriesContainer.classList.add("hidden");
        }
        document.body.style.backgroundImage = `url(${backgrounds[backgroundIndex]})`;
      }
    } else {
      // Show categories for the initial state
      categoriesContainer.classList.remove("hidden");
      document.body.style.backgroundImage = `url(${backgrounds[0]})`;
    }
  });

  categoriesContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("category-button")) {
      const category = event.target.dataset.category;

      if (category === "others") {
        const customTask = prompt("Enter a custom task:");
        if (customTask) {
          chrome.runtime.sendMessage({
            action: "generateSubtasks",
            task: customTask,
          });
        }
      } else {
        const tasks = hardcodedTasks[category].map((task) => ({
          text: task,
          completed: false,
        }));
        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex: 0,
            categoriesHidden: true,
            isFinalImage: false,
          },
        });
        renderTasks(tasks, 0);
      }

      categoriesContainer.classList.add("hidden"); // Hide categories
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateSubtasks") {
      const tasks = message.subtasks.map((task) => ({
        text: task,
        completed: false,
      }));
      chrome.storage.local.set({
        state: {
          tasks,
          backgroundIndex: 0,
          categoriesHidden: true,
          isFinalImage: false,
        },
      });
      renderTasks(tasks, 0);
    }
  });

  function renderTasks(tasks, backgroundIndex) {
    taskList.innerHTML = ""; // Clear existing tasks

    tasks.forEach((task, index) => {
      const taskItem = document.createElement("li");
      taskItem.classList.add("draggable");
      taskItem.innerHTML = `
        <input type="checkbox" ${task.completed ? "checked" : ""} />
        <span>${task.text}</span>
        <button class="delete-task">Delete</button>
      `;

      taskItem.draggable = true; // Make task draggable
      taskItem.dataset.index = index; // Store task index for drag-and-drop

      // Handle task completion
      const checkbox = taskItem.querySelector("input");
      checkbox.addEventListener("change", () => {
        tasks[index].completed = checkbox.checked;

        if (checkbox.checked) {
          // Increment background index when checked
          backgroundIndex++;
        } else {
          // Decrement background index when unchecked
          backgroundIndex = Math.max(0, backgroundIndex - 1);
        }

        if (tasks.every((task) => task.completed)) {
          // All tasks completed, set the final image
          document.body.style.backgroundImage = `url(${
            backgrounds[backgrounds.length - 1]
          })`;
          tasksContainer.classList.add("hidden");
          categoriesContainer.classList.add("hidden"); // Ensure categories stay hidden

          // Save the final image state
          chrome.storage.local.set({
            state: {
              tasks,
              backgroundIndex,
              categoriesHidden: true,
              isFinalImage: true,
            },
          });
        } else {
          // Update background to match current state
          document.body.style.backgroundImage = `url(${backgrounds[backgroundIndex]})`;

          // Save the updated state
          chrome.storage.local.set({
            state: {
              tasks,
              backgroundIndex,
              categoriesHidden: true,
              isFinalImage: false,
            },
          });
        }
      });

      // Handle task deletion
      taskItem.querySelector(".delete-task").addEventListener("click", () => {
        taskItem.remove();
        tasks.splice(index, 1); // Remove task from array

        // Save the updated state
        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex,
            categoriesHidden: true,
            isFinalImage: false,
          },
        });
      });

      taskList.appendChild(taskItem);
    });

    // Initialize SortableJS
    new Sortable(taskList, {
      animation: 600, // Animation speed
      easing: "cubic-bezier(0.22, 1, 0.36, 1)", // Smooth easing effect
      ghostClass: "sortable-ghost", // Class for the placeholder
      chosenClass: "sortable-chosen", // Class for the chosen item

      onUpdate: (evt) => {
        const [movedTask] = tasks.splice(evt.oldIndex, 1);
        tasks.splice(evt.newIndex, 0, movedTask);

        chrome.storage.local.set({
          state: {
            tasks,
            backgroundIndex,
            categoriesHidden: true,
            isFinalImage: false,
          },
        });
      },
    });

    tasksContainer.classList.remove("hidden"); // Show tasks
  }
});
