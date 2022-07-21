// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Inka.Engine.Pipelines.Blocks;
using Inka.Engine.Bootstrapping;
using Inka.Engine.Pipelines.Pipes;
using Inka.Modules.Documents.Less;

await Bootstrapper
    .New()
    .Configure(bc =>
        {
            bc.PipelineBLocks = PipelineBlocksBuilder.New(bc.Services, bc.Configuration)
                .Sequential()
                .WithPipe("Inka.Markdown", pc => pc
                    .FromDisk(new List<string> { ".md" })
                    .ToContext()
                )
                .Sequential()
                .WithPipe("Inka.Razor", pc => pc
                    .FromDisk(new List<string> { ".cshtml" })
                    .FromContext(new List<string> { ".html" })
                    .ToContext()
                )
                .Sequential()
                .WithPipe("Inka.Less", pc => pc
                    .MinifyCss()
                    .FromDisk(new List<string> { ".less" })
                    .ToContext()
                )
                .Sequential()
                .WithPipe("Inka.Static", pc => pc
                    .PreventReadContent()
                    .FromDisk(new List<string>
                        {
                            ".ico",
                            ".jpg",
                            ".jpeg",
                            ".png",
                            ".gif",
                            ".svg"
                        }
                    )
                    .ToDisk()
                )
                .Sequential()
                .WithPipe("Inka.MinifyHtml", pc => pc
                    .FromContext(new List<string>
                        {
                            ".html"
                        }
                    )
                    .ToContext()
                )
                .Sequential()
                .WithPipe("Inka.Output")
                .Sequential()
                .WithPipe("Inka.Sitemap")
                .Build();
        }
    ).RunAsync();