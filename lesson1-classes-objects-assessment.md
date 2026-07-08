# Lesson 1: Classes & Objects

Source analyzed: `public/videos/lesson1.mp4`

Confirmed lesson focus from the project lesson data: Java classes as blueprints, objects as instances, fields, methods, the `new` keyword, state, and behavior.

## 1. Lesson Summary

Lesson 1 introduces the foundation of Java Object-Oriented Programming: classes and objects. A class is presented as a blueprint that defines what data an object can store and what actions it can perform. An object is an actual instance created from that class.

The lesson emphasizes that objects have state and behavior. State is represented by fields such as `name` or `age`, while behavior is represented by methods such as `introduce()` or `displayInfo()`. Students also learn that the `new` keyword creates an object from a class, and the dot operator is used to access an object's fields and methods.

## 2. Learning Objectives

By the end of Lesson 1, students should be able to:

1. Explain the difference between a class and an object.
2. Identify fields and methods inside a Java class.
3. Create an object using the `new` keyword.
4. Access object fields and methods using the dot operator.
5. Describe object state and behavior using Java examples.
6. Write a simple Java class that models a real-world entity.
7. Explain why objects created from the same class can store different values.

## 3. Key Concepts

- Class: A blueprint or template for creating objects.
- Object: An instance of a class.
- Field: A variable declared inside a class to store object state.
- Method: A function inside a class that defines object behavior.
- State: The current values stored in an object's fields.
- Behavior: Actions an object can perform through methods.
- `new` keyword: Creates an object from a class.
- Dot operator: Accesses fields and methods through an object reference.
- Object reference: A variable that refers to an object.

## 4. Important Java Syntax

```java
class Student {
    String name;
    int age;

    void introduce() {
        System.out.println(name + " is " + age);
    }
}
```

```java
Student s1 = new Student();
```

```java
s1.name = "Mia";
s1.age = 19;
s1.introduce();
```

Important syntax patterns:

- `class Student { ... }` defines a class.
- `String name;` declares a field.
- `void introduce() { ... }` declares a method.
- `new Student()` creates an object.
- `s1.name` accesses a field.
- `s1.introduce()` calls a method.

## 5. Java Code Examples

### Example 1: Basic Class and Object

```java
class Student {
    String name;
    int age;

    void introduce() {
        System.out.println(name + " is " + age + " years old.");
    }
}

class Main {
    public static void main(String[] args) {
        Student student1 = new Student();
        student1.name = "Ana";
        student1.age = 20;

        student1.introduce();
    }
}
```

Expected output:

```text
Ana is 20 years old.
```

### Example 2: Two Objects from One Class

```java
class Book {
    String title;
    int pages;

    void showDetails() {
        System.out.println(title + " has " + pages + " pages.");
    }
}

class Main {
    public static void main(String[] args) {
        Book book1 = new Book();
        book1.title = "Java Basics";
        book1.pages = 120;

        Book book2 = new Book();
        book2.title = "OOP Guide";
        book2.pages = 200;

        book1.showDetails();
        book2.showDetails();
    }
}
```

Expected output:

```text
Java Basics has 120 pages.
OOP Guide has 200 pages.
```

### Example 3: Object State Changes

```java
class Counter {
    int value;

    void increase() {
        value++;
    }

    void display() {
        System.out.println("Value: " + value);
    }
}

class Main {
    public static void main(String[] args) {
        Counter c = new Counter();
        c.value = 1;
        c.increase();
        c.display();
    }
}
```

Expected output:

```text
Value: 2
```

## 6. Common Mistakes

1. Confusing a class with an object.
   - A class is the blueprint; an object is created from it.

2. Forgetting to use `new`.
   - `Student s;` only declares a reference. `new Student()` creates the object.

3. Calling a method without an object.
   - For instance methods, use an object reference such as `s1.introduce();`.

4. Accessing fields before understanding object state.
   - Each object stores its own field values.

5. Putting all logic inside `main`.
   - Classes should organize related data and behavior.

6. Using unclear class or field names.
   - Names should describe the modeled entity and its properties.

## 7. Key Takeaways

- A class defines the structure and behavior of objects.
- An object is an actual instance created from a class.
- Fields store object state.
- Methods define object behavior.
- The `new` keyword creates objects.
- The dot operator accesses object fields and methods.
- Multiple objects from the same class can store different values.

## 8. Multiple Choice Questions

### Easy Questions

1. Which statement best describes a Java class?

A. A command that immediately runs a program  
B. A blueprint used to create objects  
C. A value stored only inside `main`  
D. A replacement for all methods  

Correct Answer: B  
Explanation: A class defines the structure and behavior that objects can have. The other choices are incorrect because a class is not a single command, not just a local value, and does not replace methods.

2. What is an object in Java?

A. An instance created from a class  
B. A comment inside a program  
C. A keyword used only for printing  
D. A file extension for Java code  

Correct Answer: A  
Explanation: An object is an actual instance based on a class blueprint. The other options describe comments, unrelated keywords, or files rather than objects.

3. Which part of a class usually stores object state?

A. `System.out.println`  
B. Fields  
C. The file name only  
D. Curly braces only  

Correct Answer: B  
Explanation: Fields store values that describe an object's state. Printing, file names, and braces do not by themselves store object-specific data.

4. Which part of a class defines object behavior?

A. Methods  
B. Spaces  
C. Package folders only  
D. Semicolons only  

Correct Answer: A  
Explanation: Methods define actions an object can perform. Spaces, folders, and semicolons may be part of code formatting or syntax, but they do not represent behavior.

5. Which keyword is used to create a new object?

A. `class`  
B. `void`  
C. `new`  
D. `static`  

Correct Answer: C  
Explanation: The `new` keyword creates an object from a class. `class` defines a class, `void` indicates no return value, and `static` changes member access rules.

6. Given `Student s1 = new Student();`, what is `s1`?

A. The class itself  
B. A field name  
C. A method body  
D. A reference variable for a Student object  

Correct Answer: D  
Explanation: `s1` is a reference variable that refers to a `Student` object. It is not the class, a field, or a method body.

7. Which symbol is commonly used to access an object's fields or methods?

A. Dot operator `.`  
B. Hash sign `#`  
C. Question mark `?`  
D. Backslash `\`  

Correct Answer: A  
Explanation: Java uses the dot operator to access fields and methods through an object reference. The other symbols do not perform this object member access.

8. Which line correctly assigns a value to an object's field?

A. `name.Student = "Lia";`  
B. `Student.name("Lia");`  
C. `s1.name = "Lia";`  
D. `new = s1.name;`  

Correct Answer: C  
Explanation: `s1.name = "Lia";` uses the object reference and dot operator to assign a field value. The other choices use invalid or incorrect Java syntax.

9. What does object state refer to?

A. The current values stored in an object's fields  
B. The color of the code editor  
C. The number of Java files in a folder  
D. The name of the operating system  

Correct Answer: A  
Explanation: Object state means the values stored in fields at a given time. The other choices are external details and do not describe object data.

10. What does object behavior refer to?

A. The keyboard shortcut used to run Java  
B. The methods or actions an object can perform  
C. The size of the monitor  
D. The folder where Java is installed  

Correct Answer: B  
Explanation: Behavior is represented by methods that perform actions. The other choices are environment details and not object behavior.

### Medium Questions

11. What is the output of the following code?

```java
class Student {
    String name;
    int age;

    void introduce() {
        System.out.println(name + " is " + age);
    }
}

class Main {
    public static void main(String[] args) {
        Student s = new Student();
        s.name = "Marco";
        s.age = 18;
        s.introduce();
    }
}
```

A. `Marco is 18`  
B. `name is age`  
C. `Student is 18`  
D. Compilation error  

Correct Answer: A  
Explanation: The object fields are assigned `"Marco"` and `18`, and the method prints those values. The other outputs do not match the assigned field values, and the code is valid.

12. Which line creates the object in this code?

```java
Student s;
s = new Student();
s.name = "Jade";
```

A. `s.name = "Jade";`  
B. `Student s;`  
C. `s = new Student();`  
D. All three lines create objects  

Correct Answer: C  
Explanation: `new Student()` creates the actual object. `Student s;` only declares a reference, while `s.name = "Jade";` assigns a field.

13. Which statement is correct about two objects created from the same class?

A. They must always store identical field values.  
B. They can store different values in their own fields.  
C. Only the first object can call methods.  
D. The second object deletes the first object automatically.  

Correct Answer: B  
Explanation: Objects from the same class share structure but can have different state. The other choices incorrectly limit object behavior or describe automatic deletion that does not occur.

14. What is wrong with this code?

```java
class Product {
    String name;
}

class Main {
    public static void main(String[] args) {
        Product p;
        p.name = "Keyboard";
    }
}
```

A. The class name must be lowercase.  
B. The field must be declared inside `main`.  
C. The object was not created before using `p.name`.  
D. Java does not allow String fields.  

Correct Answer: C  
Explanation: `Product p;` declares only a reference, so `p` does not refer to an object yet. The code needs `p = new Product();` before accessing `p.name`.

15. Which replacement correctly completes the code?

```java
class Phone {
    String brand;
}

class Main {
    public static void main(String[] args) {
        Phone p = ________;
        p.brand = "Nova";
    }
}
```

A. `Phone;`  
B. `new Phone()`  
C. `"Phone"`  
D. `brand.Phone()`  

Correct Answer: B  
Explanation: `new Phone()` constructs a new `Phone` object. The other choices do not create a valid object instance.

16. What is the output?

```java
class Bag {
    String color;

    void showColor() {
        System.out.println(color);
    }
}

class Main {
    public static void main(String[] args) {
        Bag b1 = new Bag();
        Bag b2 = new Bag();
        b1.color = "Blue";
        b2.color = "Red";
        b2.showColor();
    }
}
```

A. `Blue`  
B. `Red`  
C. `Blue Red`  
D. Compilation error  

Correct Answer: B  
Explanation: The method is called on `b2`, whose `color` field is `"Red"`. `b1` has a separate state, so its `"Blue"` value is not printed.

17. Which statement best explains why classes help organize code?

A. They group related data and behavior into one structure.  
B. They remove the need to compile Java code.  
C. They force every program to have only one object.  
D. They prevent methods from being written.  

Correct Answer: A  
Explanation: Classes organize related fields and methods. The other choices are false because Java code still compiles, programs can have many objects, and classes commonly contain methods.

18. What should replace the missing code to call the method?

```java
class Light {
    void turnOn() {
        System.out.println("Light on");
    }
}

class Main {
    public static void main(String[] args) {
        Light lamp = new Light();
        ________;
    }
}
```

A. `Light.turnOn;`  
B. `turnOn.lamp();`  
C. `lamp.turnOn();`  
D. `new turnOn();`  

Correct Answer: C  
Explanation: `lamp.turnOn();` calls the instance method using the object reference. The other choices use invalid or incorrect method-call syntax.

19. Which code best models a real-world student as an object?

A. `int Student = 5;`  
B. `class Student { String name; int age; }`  
C. `System.out.println("Student");`  
D. `if (student) { }`  

Correct Answer: B  
Explanation: A class with fields can model a student's data. The other choices do not define a reusable object structure.

20. What is the output?

```java
class Counter {
    int value;

    void increase() {
        value++;
    }
}

class Main {
    public static void main(String[] args) {
        Counter c = new Counter();
        c.value = 3;
        c.increase();
        System.out.println(c.value);
    }
}
```

A. `0`  
B. `3`  
C. `4`  
D. Compilation error  

Correct Answer: C  
Explanation: The field starts at `3`, then `increase()` adds one. The final printed value is therefore `4`.

### Hard Questions

21. A school management system needs to store each student's name and age and allow each student to introduce themselves. Which design is most appropriate?

A. Store all student data in one long String.  
B. Create a `Student` class with fields and an `introduce()` method.  
C. Use only `System.out.println()` statements without objects.  
D. Use a separate Java file for every student name only.  

Correct Answer: B  
Explanation: A `Student` class groups the object's state and behavior clearly. The other choices make the program harder to reuse, organize, or extend.

22. What is the main design problem in this code?

```java
class Main {
    public static void main(String[] args) {
        String studentName = "Nina";
        int studentAge = 19;
        String teacherName = "Mr. Cruz";
        int teacherAge = 35;
    }
}
```

A. It uses variables but does not model related entities as classes.  
B. It has too many classes.  
C. It creates too many objects.  
D. It uses fields incorrectly inside a class.  

Correct Answer: A  
Explanation: The data is related to real-world entities, but it is stored as separate local variables. Classes could organize this state more clearly into objects such as `Student` and `Teacher`.

23. Why is `s1.name` and `s2.name` able to hold different values when `s1` and `s2` are both `Student` objects?

A. Each object has its own copy of instance fields.  
B. Java randomly chooses a name for each object.  
C. The class is duplicated in the source file.  
D. Methods erase fields after each call.  

Correct Answer: A  
Explanation: Each object has separate instance field values. The other choices describe behavior that does not happen in Java.

24. Which code shows the best use of object behavior instead of doing everything directly in `main`?

A. `System.out.println("Ana is 20");`  
B. `Student s = new Student(); s.name = "Ana"; s.age = 20; s.introduce();`  
C. `String data = "Ana,20";`  
D. `int age = 20; System.out.println(age);`  

Correct Answer: B  
Explanation: This code creates an object, assigns state, and calls a method that represents behavior. The other choices print or store values without modeling behavior through an object.

25. A beginner writes `Student s = null; s.introduce();`. What is the best explanation?

A. It works because `null` automatically creates an object.  
B. It prints the default student values.  
C. It is unsafe because `s` does not refer to an actual object.  
D. It creates two `Student` objects.  

Correct Answer: C  
Explanation: `null` means the reference does not point to an object, so calling a method through it is invalid at runtime. The other choices incorrectly assume an object is created or usable.

## Answer Key

1. B
2. A
3. B
4. A
5. C
6. D
7. A
8. C
9. A
10. B
11. A
12. C
13. B
14. C
15. B
16. B
17. A
18. C
19. B
20. C
21. B
22. A
23. A
24. B
25. C

## 9. Coding Exercises

### Exercise 1: Create a Student Class

Create a `Student` class with two fields: `name` and `age`. In `main`, create one `Student` object, assign values, and print the values.

Expected skills:

- Define a class.
- Declare fields.
- Create an object using `new`.
- Access fields using the dot operator.

### Exercise 2: Add Object Behavior

Create a `Pet` class with fields `name` and `type`. Add a method called `showInfo()` that prints both fields. Create one object and call the method.

Expected skills:

- Write an instance method.
- Use object state inside a method.
- Call a method using an object reference.

### Exercise 3: Compare Two Objects

Create a `Book` class with fields `title` and `pages`. Create two `Book` objects with different values and print each book's details.

Expected skills:

- Create multiple objects from one class.
- Show that each object has separate state.

### Exercise 4: Modify Object State

Create a `Score` class with an integer field `points`. Add a method `addPoint()` that increases `points` by 1. Create an object, set points to 5, call `addPoint()` twice, and print the result.

Expected skills:

- Modify field values through methods.
- Track object state changes.

### Exercise 5: Model a Real-World Item

Create a `Laptop` class with fields `brand`, `model`, and `price`. Add a method `displayDetails()` that prints all field values. Create two laptop objects and display their details.

Expected skills:

- Model real-world entities.
- Combine fields and methods.
- Use multiple objects.

## 10. Programming Challenges

### Challenge 1: Student Profile System

Build a simple Java program with a `StudentProfile` class. The class should have fields for `name`, `course`, `yearLevel`, and `section`. Add a method `displayProfile()` that prints a formatted student profile.

Requirements:

- Create at least three `StudentProfile` objects.
- Assign different values to each object.
- Call `displayProfile()` for each object.
- Output should clearly show that every object has its own state.

### Challenge 2: Mini Inventory Object Model

Build a Java program that models items in a small store. Create an `Item` class with fields `name`, `quantity`, and `price`. Add methods `showItem()` and `totalValue()` where `totalValue()` prints or returns `quantity * price`.

Requirements:

- Create at least three `Item` objects.
- Assign different names, quantities, and prices.
- Display each item's information.
- Display the total value for each item.
- Use object fields and methods instead of placing all logic directly in `main`.
