# Inka [![GitHub](https://img.shields.io/github/license/kokhans/inka?style=flat-square)](LICENSE)

`Inka` is a cross-platform static site generator built with [.NET 6](https://docs.microsoft.com/en-us/dotnet/core/whats-new/dotnet-6), based on rendering `Markdown` and `Razor` markup languages into `HTML`.

## Status

### Pre-Alpha

The software is still under active development and not feature complete or ready for consumption by anyone other than software developers. There may be milestones during the pre-alpha which deliver specific sets of functionality, and nightly builds for other developers or users who are comfortable living on the absolute bleeding edge.

## Features

- Engine configuration via file
- Configurable routing
- Markdown processor
- Markdown YAML front matter parser
- Razor processor
- Razor YAML front matter parser
- Razor layout
- Razor rendering data context
- Less style sheet preprocessor
- Static files copier
- HTML minifier
- Rich CLI output
- Sitemap.xml generator

## Getting Started

### Download .NET 6 SDK

Download [.NET 6 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/6.0) or newer.

### Create .NET Core Console Application

```powershell
dotnet new console
```

### Install Inka.Engine

```powershell
dotnet add package Inka.Engine
```

### Create Bootstrapper

```csharp
using Inka.Engine.Bootstrapping;

await Bootstrapper
    .New()
    .Configure(_ => { })
    .RunAsync()
```

### Add Modules

### Run It!

```powershell
dotnet run
```

## Modules

`Inka` provides a set of modules that can be used to extend and customize static site generation pipeline.

## Documents

### Markdown

`Markdown` document module.

### Razor

`Razor` document module.

### Less

`Less` document module.

### Static

Static document module.

### MinifyHtml

Minify `HTML` document module.

## Operations

### Output

Output operation module.

### Sitemap

Sitemap operation module.

## Templates

## Blog

Blog template.

## License

This project is licensed under the [MIT license](LICENSE).